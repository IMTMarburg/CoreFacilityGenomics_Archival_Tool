import shutil
import dateutil.relativedelta
import unittest
import sys
import toml
import hashlib
import tempfile
from email.mime.text import MIMEText
import smtplib
import datetime
import random
import string
import time
import re
import subprocess
import json
from pathlib import Path
import os

download_dir = Path(os.environ["DOWNLOAD_DIR"])
working_dir = Path(os.environ["WORKING_DIR"])
deleted_dir = Path(os.environ["DELETE_DIR"])
archived_dir = Path(os.environ["ARCHIVE_DIR"])
data_dir = Path(os.environ["DATA_DIR"])
event_dir = data_dir / "events"
task_dir = data_dir / "tasks"
secret_file = Path(os.environ["SECRETS_FILE"])


templates = toml.load(open(Path(os.environ["TEMPLATES_PATH"])))

times = toml.load(open(Path(os.environ["TIMES_PATH"])))

default_template = """
Your download is available at %URL%.

It will be available until %DELETION_DATE% which is %DAYS% days from now.

Further comments: %COMMENT%
"""


_events = None


def load_events():
    global _events
    if _events is None:
        events = []
        for filename in event_dir.glob("*.json"):
            try:
                timestamp, pid = re.match(
                    r"(\d+)_(\d+).*\.json", filename.name
                ).groups()
            except:
                print("invalid filename", filename.name)
                continue
            with open(filename) as f:
                event = json.load(f)
                event["timestamp"] = int(timestamp)
                event["pid"] = int(pid)
                events.append(event)
        events.sort(key=lambda t: (t["timestamp"], t["pid"]))
        _events = events
    return _events


def get_open_tasks():
    tasks = []
    for filename in task_dir.glob("*.json"):
        try:
            timestamp, pid = re.match(r"(\d+)_(\d+).json", filename.name).groups()
        except:
            print("invalid filename", filename.name)
            continue
        with open(filename) as f:
            task = json.load(f)
            task["timestamp"] = int(timestamp)
            task["pid"] = int(pid)
        if task["status"] in ("open", "processing"):
            # since there's only ever one of these running,
            # processing means 'failed, try again'
            tasks.append(task)
    tasks.sort(key=lambda t: t["timestamp"])
    return tasks


def update_task(task, updates):
    out = task.copy()
    out.update(updates)
    filename = task_dir / f"{task['timestamp']}_{task['pid']}.json"
    with open(filename, "w") as f:
        json.dump(out, f, indent=2)
    add_event(
        {
            "type": "task_update",
            "task": task,
            "updates": updates,
        }
    )


last_event_time = None


event_counter = 0


def add_event(event):
    global event_counter
    event_counter += 1
    filename = event_dir / f"{int(time.time())}_{os.getpid()}_{event_counter}.json"
    event["source"] = "archival_tool.py"
    with open(filename, "w") as f:
        json.dump(event, f, indent=2)
    print("added event", event)
    last_event_time = time.time()


def safe_name(run):
    if "/" in run:
        run = run[run.rfind("/") + 1 :]
    if "." in run:
        run = run[: run.find(".")]
    return run


def random_text(n):
    return "".join(random.choice(string.ascii_lowercase) for i in range(n))


def find_last_provided_download(to_send):
    last_provided_download = None
    for event in load_events():
        if (
            event.get("type", "") == "run_download_provided"
            and event["to_send"] == to_send
        ):
            last_provided_download = event["filename"]
        # can't do it like that because of the nesting
        # elif event['type'] == "run_download_removed" and event['run'] == run:
        # last_provided_download = None
    print("last provided", last_provided_download)
    if last_provided_download and (download_dir / last_provided_download).exists():
        return last_provided_download
    else:
        return None


def tar_output_folders(input_folders, output_file):
    # tar,b tu execlude the Data folder.
    cmd = [
        "tar",
        "-I",
        "zstd",
        "-cf",
        str(output_file.absolute()),
    ]
    for ip in input_folders:
        # remove working/ from start
        ip = ip.relative_to(working_dir)
        cmd.append(str(ip))
    print(cmd)
    # has_any_fastq_files = any((True for x in input_folder.glob("**/*.fastq*")))
    # if exclude_data_folder and has_any_fastq_files:
    #     cmd.insert(1, ["--exclude", "Data"])
    subprocess.check_call(cmd, cwd=working_dir)


def tar_and_encrypt(input_folder, output_file):
    p = subprocess.Popen(
        ["rage-keygen"], stdout=subprocess.PIPE, stderr=subprocess.PIPE
    )
    stdout, stderr = p.communicate()
    pub_key = stderr.decode("utf-8").strip()
    key = stdout.decode("utf-8").strip()
    # look like # public key: age13a3nlgjva9474uutesr2xqwtk2zcwcvdw4jdw4zkphz37jhry93qsctkys
    public_key = pub_key[pub_key.find(":") + 1 :].strip()
    # print('public key is', repr(public_key))
    tar_cmd = [
        "tar",
        "--exclude",
        # "Data",
        "--exclude={*.fastq.gz}",
        "--use-compress-program",
        "zstd -19",
        "-c",
        str(input_folder.name),
    ]
    rage_cmd = ["rage", "-e", "-", "-o", str(output_file.absolute()), "-r", public_key]
    process_tar = subprocess.Popen(
        tar_cmd, cwd=input_folder.parent, stdout=subprocess.PIPE
    )
    process_rage = subprocess.Popen(
        rage_cmd,
        stdin=process_tar.stdout,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    rage_stdout, rage_stderr = process_rage.communicate()
    tar_stdout, tar_stderr = process_tar.communicate()
    if process_tar.returncode != 0:
        raise Exception(f"tar failed {tar_stderr}")
    if process_rage.returncode != 0:
        raise Exception(f"rage failed {rage_stderr}")
    return key, output_file.stat().st_size


def decrypt_and_untar(encrypted_file, output_folder, key):
    output_folder = Path(output_folder)
    output_folder.mkdir(exist_ok=True)
    try:
        with tempfile.NamedTemporaryFile(suffix="key", mode="wb") as tf:
            tf.write(key.encode("utf-8"))
            tf.flush()
            rage_cmd = [
                "rage",
                "-d",
                str((archived_dir / encrypted_file).absolute()),
                "-i",
                tf.name,
                "-o",
                "-",
            ]
            tar_cmd = ["tar", "--zstd", "-x"]
            print(rage_cmd)
            print(tar_cmd)
            process_rage = subprocess.Popen(rage_cmd, stdout=subprocess.PIPE)
            process_tar = subprocess.Popen(
                tar_cmd, stdin=process_rage.stdout, cwd=output_folder
            )
            tar_stdout, tar_stderr = process_tar.communicate()
            rage_stdout, rage_stderr = process_rage.communicate()
            if process_tar.returncode != 0:
                raise Exception(f"tar failed {tar_stderr}")
            if process_rage.returncode != 0:
                raise Exception(f"rage failed {rage_stderr}")
    except:
        shutil.rmtree(output_folder)
        raise


def find_run(run, include_archived=False):
    candidate = working_dir / run
    if candidate.exists():
        return candidate
    else:
        if include_archived:
            query = "**/RTAComplete.txt.sha256"
        else:
            query = "**/RTAComplete.txt"
        for rta_complete in working_dir.glob(query):
            if (
                rta_complete.parent.name == run
                and not (rta_complete.parent / "CompletedJobInfo.xml").exists()
            ):
                return rta_complete.parent
    raise ValueError("Not found")


def find_run_alignment(run, alignment):
    run_dir = find_run(run)
    candidate = run_dir / run_dir.name / alignment
    if candidate.exists():
        return candidate
    else:
        raise ValueError("Alignment not found", run, alignment, candidate)


def get_template():
    path = data_dir / "template.txt"
    try:
        return path.read_text()
    except:
        return default_template


def send_email(receivers, invalidation_timestamp, comment, filename):
    with open(secret_file) as f:
        secrets = json.load(f)
    sender = secrets["mail"]["sender"]
    username = secrets["mail"]["username"]
    password = secrets["mail"]["password"]
    smtp_server = secrets["mail"]["host"]
    smtp_port = secrets["mail"]["port"]
    template = get_template()
    url = secrets["mail"]["url"] + filename
    message = template.replace("%URL%", url)
    invalidation_date = datetime.datetime.fromtimestamp(invalidation_timestamp)
    message = message.replace("%DELETION_DATE%", invalidation_date.strftime("%Y-%m-%d"))
    message = message.replace(
        "%DAYS%", str((invalidation_date - datetime.datetime.now()).days)
    )
    if comment:
        message = message.replace("%COMMENT%", comment)
    else:
        message = message.replace("%COMMENT%", "(no comment provided)")

    msg = MIMEText(message)
    msg["Subject"] = "Sequencing run ready for download"
    msg["From"] = sender
    msg["To"] = ",".join(receivers)
    s = smtplib.SMTP(smtp_server, smtp_port)
    s.starttls()
    s.login(username, password)
    res = s.sendmail(msg["From"], receivers, msg.as_string())
    if res:
        raise ValueError(res)
    res = s.quit()
    return str(msg)


def provide_download_link(task):
    to_send = task["to_send"]
    if len(to_send) == 0:
        name = to_send[0].split("___")[0]
    else:
        name = "multiple_sequencing_runs"
    name = safe_name(name)

    output_name = (
        time.strftime("%Y-%m-%d_%H-%M-%S_") + name + "_" + random_text(5) + ".tar.zstd"
    )
    last_provided_download = find_last_provided_download(task["to_send"])
    try:
        if last_provided_download:
            os.link(download_dir / last_provided_download, download_dir / output_name)
        else:
            # todo: this is what we need to implement next
            print(task)
            paths_to_include = []
            for run_alignment in to_send:
                run, alignment = run_alignment.split("___")
                if alignment == "complete":
                    paths_to_include.append(find_run(run))
                else:
                    paths_to_include.append(find_run_alignment(run, alignment))
            print(paths_to_include)
            tar_output_folders(paths_to_include, download_dir / output_name)
        if task["receivers"]:
            try:
                email = send_email(
                    task["receivers"],
                    task["invalid_after"],
                    task["comment"],
                    output_name,
                )
                email_success = "Mail sent:\n" + email
            except Exception as e:
                email_success = f"Sent failed: {e}"
                raise
        else:
            email_success = "No receivers"
        add_event(
            {
                "type": "run_download_provided",
                "run": task["to_send"],
                "filename": str(output_name),
                "finish_time": int(time.time()),
                "details": {"receivers": task["receivers"]},
                "email_success": email_success,
                "invalid_after_timestamp": task["invalid_after"],
            }
        )
        update_task(
            task,
            {
                "status": "done",
                "filename": output_name,
                "email_success": email_success.startswith("Mail sent"),
                "finish_time": int(time.time()),
            },
        )
    except Exception as e:
        raise
        update_task(task, {"status": "failed", "msg": str(e)})


def cleanup_downloads():
    invalidation_dates = {}
    for event in load_events():
        if event["type"] == "run_download_provided":
            invalidation_dates[event["filename"]] = event
        if event["type"] == "run_download_removed":
            try:
                del invalidation_dates[event["filename"]]
            except KeyError:
                pass
    now = time.time()
    for filename in download_dir.glob("*"):
        if filename.is_file():
            if filename.name in invalidation_dates:
                if invalidation_dates[filename.name]["invalid_after_timestamp"] < now:
                    print("Delete download", filename)
                    filename.unlink()
                    add_event(
                        {
                            "type": "run_download_removed",
                            "filename": str(filename.name),
                            "run": invalidation_dates[filename.name]["run"],
                        }
                    )
                else:
                    # print('keep download', filename)
                    pass


def extract_american_date_and_convert_to_unix_timestamp(input_str):
    # Use regex to extract the first occurrence of an American date in the format of "m/d/yyyy h:m:s AM/PM"
    date_match = re.search(
        r"\d{1,2}/\d{1,2}/\d{4}\s+\d{1,2}:\d{2}:\d{2}\s+(?:AM|PM)", input_str
    )

    if not date_match:
        return None

    # Extract the date string from the regex match
    date_str = date_match.group(0)
    # Parse the date string into a datetime object
    date_obj = datetime.datetime.strptime(date_str, "%m/%d/%Y %I:%M:%S %p")
    # Convert the datetime object to a Unix timestamp
    timestamp = int(time.mktime(date_obj.timetuple()))
    return timestamp


def extract_american_date_and_convert_to_unix_timestamp_format2(input_str):
    # parse "11/27/2020,07:26:21.901,Illumina RTA 1.18.54"
    date_match = re.search(
        r"\d{1,2}/\d{1,2}/\d{4},\d{1,2}:\d{2}:\d{2}\.\d{3}", input_str
    )
    if not date_match:
        return None
    date_obj = datetime.datetime.strptime(date_match.group(0), "%m/%d/%Y,%H:%M:%S.%f")
    timestamp = int(time.mktime(date_obj.timetuple()))
    return timestamp


def extract_date_months_as_text(input_str):
    # formated like 11-Feb-21 5:54:11 PM
    date_match = re.search(
        r"\d{1,2}-[A-Za-z]{3}-\d{2}\s+\d{1,2}:\d{2}:\d{2}\s+(?:AM|PM)", input_str
    )
    if not date_match:
        return None
    date_obj = datetime.datetime.strptime(date_match.group(0), "%d-%b-%y %I:%M:%S %p")
    timestamp = int(time.mktime(date_obj.timetuple()))
    return timestamp


def extract_illumina_date(input_str):
    for parser in [
        extract_american_date_and_convert_to_unix_timestamp,
        extract_american_date_and_convert_to_unix_timestamp_format2,
        extract_date_months_as_text,
    ]:
        try:
            timestamp = parser(input_str)
            if timestamp is not None:
                return timestamp
        except:
            pass
    return None


def load_sample_sheet(dir):
    sample_sheet = ""
    sample_sheet_filename = dir / "SampleSheet.csv"
    if sample_sheet_filename.exists():
        try:
            sample_sheet = sample_sheet_filename.read_text()
        except:
            sample_sheet = "Could not be read"
    return sample_sheet


def discover_runs():
    ever = set()
    current = set()
    current_alignments = set()
    alignments_seen = set()

    for event in load_events():
        t = event.get("type", "")
        if t == "run_discovered" or t == "run_restored_to_working_set":
            ever.add(event["run"])
            current.add(event["run"])
        elif t == "run_deleted_from_working_set":
            current.remove(event["run"])
            current_alignments = {
                (run, alignment)
                for run, alignment in current_alignments
                if run != event["run"]
            }
        elif t == "alignment_discovered":
            # alignments_ever.add((event["run"], event["alignment"]))
            current_alignments.add((event["run"], event["alignment"]))
        elif t == "alignment_removed":
            current_alignments.remove((event["run"], event["alignment"]))

    # make sure we get the runs before the alignments
    q = sorted(
        working_dir.glob("**/RTAComplete.txt"), key=lambda x: (str(x).count("/"), x)
    )
    for rta_complete in q:
        run = rta_complete.parent.name
        run_finish_date = extract_illumina_date(rta_complete.read_text())
        if not run_finish_date:
            if not rta_complete.read_text():
                run_finish_date = rta_complete.stat().st_mtime
            else:
                raise ValueError("could not extract date", rta_complete)

        alignment_detection_file = rta_complete.parent / "CompletedJobInfo.xml"
        if alignment_detection_file.exists():
            if not run in current:
                # we exploit that it's parents before children in globbing with **
                print(current, run)
                raise ValueError("run had alignment, but is not in current?!)")
            for possibly_alignment_dir in rta_complete.parent.glob("*"):
                if (
                    possibly_alignment_dir.is_dir()
                    and possibly_alignment_dir.name.startswith("Alignment_")
                ):
                    al = (run, possibly_alignment_dir.name)
                    alignments_seen.add(al)
                    if al not in current_alignments:
                        # I'm going to assume that it's *done*
                        # at this poin, since we had CompletedJobInfo.xml...
                        for filename in possibly_alignment_dir.glob("**/*.fastq.gz"):
                            store_hash(filename)
                        current_alignments.add(al)
                        add_event(
                            {
                                "type": "alignment_discovered",
                                "alignment": possibly_alignment_dir.name,
                                "run": str(run),
                                "sample_sheet": load_sample_sheet(rta_complete.parent),
                            }
                        )
        else:
            # it is a run

            if run not in ever:
                add_event(
                    {
                        "type": "run_discovered",
                        "run": str(run),
                        "run_finish_date": run_finish_date,
                        "sample_sheet": load_sample_sheet(rta_complete.parent),
                    }
                )
                current.add(str(run))
                ever.add(str(run))
            elif run not in current:
                current.add(str(run))
                add_event({"type": "run_restored_to_working_set", "run": str(run)})
    for al in current_alignments.difference(alignments_seen):
        add_event(
            {
                "type": "alignment_removed",
                "run": str(al[0]),
                "alignment": str(al[1]),
            }
        )


def store_hash(filename):
    hashfile = filename.with_suffix(filename.suffix + ".sha256")
    if not hashfile.exists():
        h = hashlib.sha256()
        with open(filename, "rb") as op:
            bs = 50 * 1024 * 1024
            block = op.read(bs)
            while block:
                h.update(block)
                block = op.read(bs)
        hashfile.write_text(h.hexdigest())


def delete_run(task):  # from working dir.
    source = find_run(task["run"])
    target = deleted_dir / task["run"]
    shutil.copytree(source, target, dirs_exist_ok=True)
    # we only remove the data intensive files,
    # keeping the run folder far statistics etc as it is.
    # and since I'm paranoid, we're also keeping a hash
    # of each file.
    # shutil.rmtree(source)

    files = list()
    files.extend(source.glob("**/*.fastq.gz"))
    data_path = source / "Data" / "Intensities"
    files.extend(data_path.glob("**/*"))
    files.extend(
        source.glob("**/RTAComplete.txt")
    )  # otherwise we redetect the alignments

    for filename in files:
        if filename.is_file():
            store_hash(filename)
            filename.unlink()

    add_event({"type": "run_deleted_from_working_set", "run": task["run"]})


def add_time_interval(start_datetime, interval_name):
    value= times[interval_name]['value']
    unit = times[interval_name]['unit']
    if unit == 'seconds':
        return start_datetime + datetime.timedelta(seconds=value)
    elif unit == 'minutes':
        return start_datetime + datetime.timedelta(minutes=value)
    elif unit == 'hours':
        return start_datetime + datetime.timedelta(hours=value)
    if unit == 'days':
        return start_datetime + datetime.timedelta(days=value)
    elif unit == 'weeks':
        return start_datetime + datetime.timedelta(weeks=value)
    elif unit == 'months':
        return start_datetime + dateutil.relativedelta.relativedelta(months=value)
    elif unit == 'years':
        return start_datetime + dateutil.relativedelta.relativedelta(years=value)

def archive_run(task):
    source = find_run(task["run"])
    source_folder = str(source.relative_to(working_dir).parent)
    target = archived_dir / (safe_name(task["run"]) + ".tar.zstd.age")
    key, size = tar_and_encrypt(source, target)
    today = datetime.datetime.today()
    end_date = add_time_interval(today, 'archive')
    end_timestamp = int(time.mktime(end_date.timetuple()))
    add_event(
        {
            "type": "run_archived",
            "run": task["run"],
            "archive_date": int(time.time()),
            "source_folder": source_folder,
            "filename": target.name,
            "size": size,
            "key": key,
            "archive_end_date": end_timestamp,
        }
    )


def unarchive_run(task):
    events = load_events()
    for ev in reversed(events):
        if ev["type"] == "run_archived" and ev["run"] == task["run"]:
            source = ev["filename"]
            key = ev["key"]
            # the tarstarts with ./run_name.
            # we need to find out where it might have moved .
            try:
                path = find_run(ev["run"], include_archived=True)
                target = path.parent
            except ValueError:
                target = working_dir / ev["source_folder"]
                target.parent.mkdir(exist_ok=True, parents=True)
            if (target / ev["run"] / "RTAComplete.txt").exists():
                update_task(
                    task,
                    {
                        "status": "failed",
                        "reason": "already present in working directory",
                    },
                )
                return
            decrypt_and_untar(source, target, key)
            update_task(task, {"status": "done", "finish_time": int(time.time())})
            return
    update_task(task, {"status": "failed", "reason": "could not find archive event"})
    raise ValueError("could not find archive event")


def find_archive(run):
    events = load_events()
    for ev in reversed(events):
        if ev["type"] == "run_archived" and ev["run"] == run:
            return ev["filename"]


def delete_from_archive(task):
    target = archived_dir / find_archive(task["run"])
    target.unlink()
    add_event(
        {
            "type": "run_deleted_from_archive",
            "run": task["run"],
        }
    )
    update_task(task, {"status": "done"})


def sort_by_date(task):
    for fn in working_dir.glob("*"):
        if fn.is_dir():
            if len(fn.name) <= 4:
                continue
            year = fn.name[:2]
            try:
                year_int = int(year)
            except:
                continue
            rta_existed = False
            for rta_fn in fn.glob("RTAComplete.txt*"):
                rta_existed = True
                break
            folder_name = "20" + year
            folder = working_dir / folder_name
            folder.mkdir(exist_ok=True)
            shutil.move(fn, folder / fn.name)

    update_task(task, {"status": "done"})


for task in get_open_tasks():
    print("got task", task)
    if task["type"] == "provide_download_link":
        update_task(task, {"status": "processing"})
        provide_download_link(task)
    elif task["type"] == "delete_run":
        if task["timestamp"] < (add_time_interval(datetime.datetime.now(), 'deletion_delay')).timestamp():
            update_task(task, {"status": "processing"})
            delete_run(task)
            update_task(
                task,
                {
                    "status": "done",
                    "finish_time": int(time.time()),
                },
            )

    elif task["type"] == "archive_run":
        update_task(task, {"status": "processing"})
        archive_run(task)
        if task.get("delete_after_archive", False):
            delete_run(task)
        update_task(
            task,
            {
                "status": "done",
                "finish_time": int(time.time()),
            },
        )
    elif task["type"] == "restore_run":
        update_task(task, {"status": "processing"})
        unarchive_run(task)
    elif task["type"] == "remove_from_archive":
        if task["timestamp"] < (add_time_interval(datetime.datetime.now(), 'deletion_delay')).timestamp():
            update_task(task, {"status": "processing"})
            delete_from_archive(task)
    elif task["type"] == "sort_by_date":
        update_task(task, {"status": "processing"})
        sort_by_date(task)


class TestTimeIntervals(unittest.TestCase):

    def test_add_interval(self):
        start = datetime.datetime(2021, 1, 1, 0, 0, 0)
        times['test'] = {'value': 1, 'unit': 'seconds'}
        end = add_time_interval(start, 'test')
        assert end == datetime.datetime(2021, 1, 1, 0, 0, 1)
        times['test'] = {'value': 1, 'unit': 'minutes'}
        end = add_time_interval(start, 'test')
        assert end == datetime.datetime(2021, 1, 1, 0, 1, 0)
        times['test'] = {'value': 1, 'unit': 'hours'}
        end = add_time_interval(start, 'test')
        assert end == datetime.datetime(2021, 1, 1, 1, 0, 0)
        times['test'] = {'value': 1, 'unit': 'days'}
        end = add_time_interval(start, 'test')
        assert end == datetime.datetime(2021, 1, 2, 0, 0, 0)
        times['test'] = {'value': 1, 'unit': 'weeks'}
        end = add_time_interval(start, 'test')
        assert end == datetime.datetime(2021, 1, 8, 0, 0, 0)
        times['test'] = {'value': 1, 'unit': 'months'}
        end = add_time_interval(start, 'test')
        assert end == datetime.datetime(2021, 2, 1, 0, 0, 0)
        times['test'] = {'value': 1, 'unit': 'years'}
        end = add_time_interval(start, 'test')
        assert end == datetime.datetime(2022, 1, 1, 0, 0, 0)
        times['test'] = {'value': 31, 'unit': 'days'}
        end = add_time_interval(start, 'test')
        assert end == datetime.datetime(2021, 2, 1, 0, 0, 0)
        times['test'] = {'value': 15, 'unit': 'months'}
        end = add_time_interval(start, 'test')
        assert end == datetime.datetime(2022, 4, 1, 0, 0, 0)


if __name__ == '__main__':
    if '--test' in sys.argv:
        sys.argv.remove('--test')
        unittest.main()

    else:
        cleanup_downloads()
        discover_runs()
