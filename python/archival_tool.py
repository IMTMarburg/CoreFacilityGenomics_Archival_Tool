from ctypes import alignment
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
import pybars
import time
import re
import subprocess
import json
from pathlib import Path
import os
from loguru import logger

download_dir = Path(os.environ["DOWNLOAD_DIR"]).absolute()
working_dir = Path(os.environ["WORKING_DIR"]).absolute()
deleted_dir = Path(os.environ["DELETE_DIR"]).absolute()
archived_dir = Path(os.environ["ARCHIVE_DIR"]).absolute()
data_dir = Path(os.environ["DATA_DIR"]).absolute()
event_dir = data_dir / "events"
task_dir = data_dir / "tasks"
secret_file = Path(os.environ["SECRETS_FILE"]).absolute()
do_send_emails = os.environ.get("DO_SEND_EMAILS", "") == "true"

default_templates = toml.load(open(Path(os.environ["TEMPLATES_PATH"]).absolute()))

times = toml.load(open(Path(os.environ["TIMES_PATH"]).absolute()))
with open(secret_file) as f:
    secrets = json.load(f)

task_dir.mkdir(parents=True, exist_ok=True)
event_dir.mkdir(parents=True, exist_ok=True)

_events = None

if "FAKE_TIME" in os.environ:
    NOW = datetime.datetime.fromisoformat(os.environ["FAKE_TIME"])
else:
    NOW = datetime.datetime.today()


def load_events():
    """Load events from disk, sorted by timestamp, ascending"""
    global _events
    if _events is None:
        events = []
        for filename in event_dir.glob("*.json"):
            try:
                timestamp, pid = re.match(
                    r"^(\d+)_(\d+).*\.json$", filename.name
                ).groups()
            except:
                logger.error("invalid filename", filename.name)
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
            timestamp, pid = re.match(r"^(\d+)_(\d+).*.json$", filename.name).groups()
        except:
            logger.error("invalid filename", filename.name)
            continue
        with open(filename) as f:
            task = json.load(f)
            task["timestamp"] = int(timestamp)
            task["pid"] = int(pid)
            task["task_filename"] = filename.name
        if task["status"] in ("open", "processing"):
            # since there's only ever one of these running,
            # processing means 'failed, try again'
            tasks.append(task)
    tasks.sort(key=lambda t: t["timestamp"])
    return tasks


def update_task(task, updates):
    out = task.copy()
    out.update(updates)
    filename = task_dir / task["task_filename"]
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
    logger.info(f"added event {event}")
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
        if event.get("type", "") == "run_download_provided" and event["run"] == to_send:
            last_provided_download = event["filename"]
        # can't do it like that because of the nesting
        # elif event['type'] == "run_download_removed" and event['run'] == run:
        # last_provided_download = None
    logger.debug(f"last provided download for {to_send}: {last_provided_download}")
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
    logger.debug(f"taring output folders with {cmd}")
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
        "zstd",
        # "zstd -19",
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
            logger.debug(f"rage cmd: {rage_cmd}")
            logger.debug(f"tar cmd: {tar_cmd}")
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


class CachedRunSearcher:
    def __init__(self):
        self.cache_path = data_dir / "run_cache.json"
        self.folders_to_remember = [".", "NextSeq", "NovaSeq"]
        self.load_cache()

    def load_cache(self):
        redo = not self.cache_path.exists()
        if redo:
            self.remembered_folders = {}
            self.archived_runs = {}
            self.runs = {}
            self.alignments = {}

        if not redo:
            logger.debug("Run Cache file existed")
            self._load_from_cache_file()
            if not self._check_cache():
                logger.info("Rebuilding cache because of run deletion/move")
                redo = True
            else:  # cache was ok - new folders maybe?
                for folder in self.folders_to_remember:
                    if Path(folder).exists():
                        if self.remembered_folders.get(
                            folder, set()
                        ) != self.list_dirs_in_folder(folder):
                            redo = True
                            logger.info(
                                f"Rebuilding cache because of new folders in watched folder {folder}"
                            )
                            break
        if redo:
            self._build_cache()

    def _load_from_cache_file(self):
        data = json.loads(self.cache_path.read_text())
        self.remembered_folders = data["remembered_folders"]
        self.runs = data["runs"]
        self.archived_runs = data["archived_runs"]
        self.alignments = data["alignments"]

    def _check_cache(self):
        for k in "runs", "archived_runs", "alignments":
            d = getattr(self, k)
            for name, str_path in d.items():
                path = Path(str_path)
                if not path.exists():
                    logger.info(f"Missing {k} {name} in path {path}- rebuild cache")
                    return False
        return True

    def list_dirs_in_folder(self, folder):
        path = working_dir / folder
        return sorted([x.name for x in path.iterdir() if x.is_dir()])

    def custom_search(self, path=".", depth=0):
        path = Path(path)

        # Base case: If the depth is more than 2 and the directory name is not like its parent, return
        if depth > 2 and (path.parent.name != path.name):
            return
        # print("ex", path)

        # Search for 'RTA_complete.txt' within the current path

        # If current path is a directory
        if path.is_dir():
            for child in path.iterdir():
                if child.name in (
                    "RTAComplete.txt",
                    "RTAComplete.txt.sha256",
                    "Fastq",
                ):
                    yield child
                # If child directory has the same name as its parent and we're at depth 2, reset depth
                if child.is_dir():
                    if depth == 2 and child.name == path.name:
                        yield from self.custom_search(child, depth=0)
                    else:
                        yield from self.custom_search(child, depth=depth + 1)

    def find_runs(self):
        runs = {}
        alignments = {}
        archived_runs = {}
        for path in self.custom_search(working_dir):
            if path.name == "RTAComplete.txt.sha256":
                archived_runs[path.parent.name] = str(path.parent)
            elif path.name == "RTAComplete.txt":
                runs[path.parent.name] = str(path.parent)
            elif path.name == "Fastq":
                if any((x.name.endswith(".fastq.gz") for x in path.iterdir())):
                    if path.parent.parent.name.startswith("Alignment"):
                        run = path.parent.parent.parent.name
                        alignment_name = path.parent.parent.name
                        alignment_path = path.parent.parent
                        alignments[run + "/" + alignment_name] = str(alignment_path)

            else:
                raise ValueError("Unexpected filename")
        return runs, archived_runs, alignments

    def _build_cache(self):
        runs, archived_runs, alignments = self.find_runs()
        out_json = {
            "runs": runs,
            "archived_runs": archived_runs,
            "alignments": alignments,
            "remembered_folders": {
                x: self.list_dirs_in_folder(x) for x in self.folders_to_remember if Path(x).exists()
            },
        }
        self.cache_path.write_text(json.dumps(out_json, indent=4))
        self.runs = runs
        self.archived_runs = archived_runs
        self.alignments = alignments


runs = CachedRunSearcher()


def find_run(run, include_archived=False):
    if include_archived:
        return Path(runs.archived_runs[run])
    else:
        return Path(runs.runs[run])


def find_run_alignment(run, alignment):
    return Path(runs.alignments[run + "/" + alignment])


def apply_template(template_name, template_data):
    # find latest version of the template from the events
    template = None
    for event in reversed(load_events()):
        if (
            event.get("type", "") == "template_changed"
            and event["name"] == template_name
        ):
            template = event["text"]
            subject = event["subject"]
            break
    if template is None:
        template = default_templates[template_name]["default"]
        subject = default_templates[template_name]["subject"]
    from pybars import Compiler

    compiler = Compiler()
    template = compiler.compile(template)
    return subject, template(template_data)


def send_email(receivers, template_name, template_data):
    sender = secrets["mail"]["sender"]
    username = secrets["mail"]["username"]
    password = secrets["mail"]["password"]
    smtp_server = secrets["mail"]["host"]
    smtp_port = secrets["mail"]["port"]
    subject, message = apply_template(template_name, template_data)

    msg = MIMEText(message)
    msg["Subject"] = subject
    msg["From"] = sender
    msg["To"] = ",".join(receivers)
    if do_send_emails:
        s = smtplib.SMTP(smtp_server, smtp_port)
        s.starttls()
        s.login(username, password)
        res = s.sendmail(msg["From"], receivers, msg.as_string())
        if res:
            raise ValueError(res)
        res = s.quit()
    add_event(
        {
            "type": "email_send",
            "contents": str(msg.as_string()),
        }
    )
    return msg.as_string()


def provide_download_link(task):
    logger.debug("providing download link")
    to_send = task["to_send"]
    if len(to_send) == 1:
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
            paths_to_include = []
            for run_alignment in to_send:
                run, alignment = run_alignment.split("___")
                if alignment == "complete":
                    paths_to_include.append(find_run(run))
                else:
                    paths_to_include.append(find_run_alignment(run, alignment))
            logger.debug(f"including these paths: {paths_to_include}")
            tar_output_folders(paths_to_include, download_dir / output_name)
        if task["receivers"]:
            try:
                email = send_email(
                    task["receivers"],
                    "download_ready",
                    {
                        "URL": secrets["mail"]["url"] + output_name,
                        "SIZE": format_number(
                            (download_dir / output_name).stat().st_size
                        ),
                        "DELETION_DATE": format_date(
                            datetime.datetime.fromtimestamp(task["invalid_after"])
                        ),
                        "DAYS": days_until(
                            datetime.datetime.fromtimestamp(task["invalid_after"])
                        ),
                        "COMMENT": task["comment"],
                    },
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
    logger.info("cleanup downloads")
    invalidation_dates = {}
    for event in load_events():
        if event["type"] == "run_download_provided":
            invalidation_dates[event["filename"]] = event
        if event["type"] == "run_download_removed":
            try:
                del invalidation_dates[event["filename"]]
            except KeyError:
                pass
    now = NOW.timestamp()
    for filename in download_dir.glob("*"):
        if filename.is_file():
            if filename.name in invalidation_dates:
                if invalidation_dates[filename.name]["invalid_after_timestamp"] < now:
                    logger.info(f"Delete download {filename}, because it was expired")
                    filename.unlink()
                    add_event(
                        {
                            "type": "run_download_removed",
                            "filename": str(filename.name),
                            "run": invalidation_dates[filename.name]["run"],
                        }
                    )
                else:
                    pass
            else:
                logger.error(
                    f"Found download file for which I had no expiration date {filename}"
                )


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
    logger.info("Discovering runs")
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
                (run_alignment)
                for run_alignment in current_alignments
                if run != event["run"]
            }
        elif t == "alignment_discovered":
            # alignments_ever.add((event["run"], event["alignment"]))
            current_alignments.add((event["run"] + '/' + event["alignment"]))
        elif t == "alignment_removed":
            current_alignments.remove((event["run"] + '/' + event["alignment"]))

    # make sure we get the runs before the alignments
    for run, str_path in runs.runs.items():
        if not run in ever:
            path = Path(str_path)
            rta_complete = path / "RTAComplete.txt"
            run_finish_date = extract_illumina_date(rta_complete.read_text())
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
        else:
            pass # we know about this run.

    for run_alignment, str_path in runs.alignments.items():
        alignments_seen.add(run_alignment)
        if run_alignment not in current_alignments:
            alignment_dir = Path(str_path)
            # I'm going to assume that it's *done*
            # at this poin, since we had CompletedJobInfo.xml...
            for filename in alignment_dir.glob("**/*.fastq.gz"):
                store_hash(filename)
            current_alignments.add(run_alignment)
            add_event(
                {
                    "type": "alignment_discovered",
                    "alignment": run_alignment.split("/")[1],
                    "run": run_alignment.split("/")[0],
                    "sample_sheet": load_sample_sheet(alignment_dir),
                }
            )
        else:
            pass # we know that alignment

    for al in current_alignments.difference(alignments_seen):
        add_event(
            {
                "type": "alignment_removed",
                "run": al.split("/")[0],
                "alignment": al.split("/")[1],
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
    logger.debug("Deleting run")
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

    add_event(
        {
            "type": "run_deleted_from_working_set",
            "run": task["run"],
            "deletion_timestamp": time.time(),
        }
    )


def parse_iso_date(s):
    return datetime.datetime.strptime(s, "%Y-%m-%d")


def format_number(number):
    return f"{number:,.2f}"


def format_date(dt):
    return dt.strftime("%Y-%m-%d")


def days_until(dt):
    return (dt - NOW).days


def add_time_interval(start_datetime, interval_name):
    value = times[interval_name]["value"]
    unit = times[interval_name]["unit"]
    if unit == "seconds":
        return start_datetime + datetime.timedelta(seconds=value)
    elif unit == "minutes":
        return start_datetime + datetime.timedelta(minutes=value)
    elif unit == "hours":
        return start_datetime + datetime.timedelta(hours=value)
    if unit == "days":
        return start_datetime + datetime.timedelta(days=value)
    elif unit == "weeks":
        return start_datetime + datetime.timedelta(weeks=value)
    elif unit == "months":
        return start_datetime + dateutil.relativedelta.relativedelta(months=value)
    elif unit == "years":
        return start_datetime + dateutil.relativedelta.relativedelta(years=value)


def archive_run(task):
    source = find_run(task["run"])
    source_folder = str(source.relative_to(working_dir).parent)
    target = archived_dir / (safe_name(task["run"]) + ".tar.zstd.age")
    key, size = tar_and_encrypt(source, target)
    end_date = add_time_interval(NOW, "archive")
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


def calculate_archive_size(run_name):
    logger.debug(f"Calculating archive size {run_name}")
    source = find_run(run_name)
    tf = tempfile.NamedTemporaryFile()
    key, size = tar_and_encrypt(source, Path(tf.name))
    tf.close()
    return size


def unarchive_run(task):
    logger.debug("unarchiving run")
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
    logger.debug("Deleting from archive")
    target = archived_dir / find_archive(task["run"])
    target.unlink()
    add_event(
        {
            "type": "run_deleted_from_archive",
            "run": task["run"],
            "archive_deletion_date": time.time(),
        }
    )
    update_task(task, {"status": "done"})


def sort_by_date(task):
    logger.debug("Sort_by_date")
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


def send_annotation_email(task):
    logger.debug("Sending annotation email")
    info = task
    run = task["run"]
    if task["do_archive"]:
        archive_size_bytes = calculate_archive_size(task["run"])
        archive_size = format_number(archive_size_bytes / 1024**3) + " GB"
    else:
        archive_size_bytes = None
        archive_size = "n/a"

    msg = send_email(
        info["receivers"],
        "run_completed",
        {
            "RUN_NAME": run,
            "DELETION_DATE": format_date(
                datetime.datetime.fromtimestamp(info["deletion_date"])
            ),
            "DAYS": days_until(datetime.datetime.fromtimestamp(info["deletion_date"])),
            "DO_ARCHIVE": bool(info["do_archive"]),
            "ARCHIVE_UNTIL": info.get("archive_deletion_date", None),
            "ARCHIVE_SIZE": archive_size,
            "COMMENT": info["comment"],
            "DOWNLOAD_BEING_PREPARED": info["send_download_link"],
            "UPDATE": info["is_update"],
        },
    )
    if archive_size_bytes is not None:
        add_event(
            {
                "type": "archive_size_estimated",
                "run": run,
                "archive_size": archive_size_bytes,
            },
        )
    update_task(task, {"status": "done", "email": msg})


def send_deletion_warnings():
    logger.debug("send_deletion_warnings")
    events = load_events()
    warned = {
        x["info"].get("RUN_NAME", x["info"].get("RUN"))
        for x in events
        if x["type"] == "deletion_warning_sent"
    }
    warn_if_deleted_before_this_date = add_time_interval(NOW, "deletion_warning")
    to_warn = []
    for event in events:
        if event["type"] == "run_annotated":
            if event["run_finished"]:
                deletion_date_time = datetime.datetime.fromtimestamp(
                    event["deletion_date"]
                )
                if deletion_date_time < warn_if_deleted_before_this_date:
                    if event["run"] not in warned:
                        to_warn.append(
                            {
                                "run": event["run"],
                                "receivers": event["receivers"],
                                "deletion_date_time": deletion_date_time,
                                "do_archive": event["do_archive"],
                                "archive_until_date": event.get(
                                    "archive_until_date", None
                                ),
                            }
                        )
    for target in to_warn:
        if target["archive_until_date"] is not None:
            archive_until_date = format_date(target["archive_until_date"])
        else:
            archive_until_date = None
        info = {
            "RUN_NAME": target["run"],
            "DELETION_DATE": format_date(target["deletion_date_time"]),
            "DAYS": days_until(target["deletion_date_time"]),
            "DO_ARCHIVE": target["do_archive"],
            "ARCHIVE_UNTIL": archive_until_date,
            "RECEIVERS": target["receivers"],
        }
        send_email(target["receivers"], "run_about_to_be_deleted", info)
        print(repr(target))
        add_event(
            {
                "type": "deletion_warning_sent",
                "info": info,
            }
        )


def send_archive_deletion_warnings():
    logger.debug("send_archive_deletion_warnings")
    events = load_events()
    warned = {
        x["info"].get("RUN_NAME", x["info"].get("RUN"))
        for x in events
        if x["type"] == "archive_deletion_warning_sent"
    }
    warn_if_deleted_before_this_date = add_time_interval(
        NOW, "archive_deletion_warning"
    )
    archived = {x["run"] for x in events if x["type"] == "run_archived"}

    to_warn = []
    for event in events:
        if event["type"] == "run_annotated":
            if (
                event["run_finished"]
                and event["do_archive"]
                and event["run"] in archived
            ):
                deletion_date_time = datetime.datetime.fromtimestamp(
                    event["archive_deletion_date"]
                )
                if deletion_date_time < warn_if_deleted_before_this_date:
                    if event["run"] not in warned:
                        to_warn.append(
                            {
                                "run": event["run"],
                                "receivers": event["receivers"],
                                "archive_deletion_date": deletion_date_time,
                            }
                        )
    for target in to_warn:
        info = {
            "RUN_NAME": target["run"],
            "DAYS": days_until(target["archive_deletion_date"]),
            "ARCHIVE_UNTIL": format_date(target["archive_deletion_date"]),
            "RECEIVERS": target["receivers"],
        }
        send_email(target["receivers"], "run_about_to_be_removed_from_archive", info)
        add_event(
            {
                "type": "archive_deletion_warning_sent",
                "info": info,
            }
        )


class TestTimeIntervals(unittest.TestCase):
    def test_add_interval(self):
        start = datetime.datetime(2021, 1, 1, 0, 0, 0)
        times["test"] = {"value": 1, "unit": "seconds"}
        end = add_time_interval(start, "test")
        assert end == datetime.datetime(2021, 1, 1, 0, 0, 1)
        times["test"] = {"value": 1, "unit": "minutes"}
        end = add_time_interval(start, "test")
        assert end == datetime.datetime(2021, 1, 1, 0, 1, 0)
        times["test"] = {"value": 1, "unit": "hours"}
        end = add_time_interval(start, "test")
        assert end == datetime.datetime(2021, 1, 1, 1, 0, 0)
        times["test"] = {"value": 1, "unit": "days"}
        end = add_time_interval(start, "test")
        assert end == datetime.datetime(2021, 1, 2, 0, 0, 0)
        times["test"] = {"value": 1, "unit": "weeks"}
        end = add_time_interval(start, "test")
        assert end == datetime.datetime(2021, 1, 8, 0, 0, 0)
        times["test"] = {"value": 1, "unit": "months"}
        end = add_time_interval(start, "test")
        assert end == datetime.datetime(2021, 2, 1, 0, 0, 0)
        times["test"] = {"value": 1, "unit": "years"}
        end = add_time_interval(start, "test")
        assert end == datetime.datetime(2022, 1, 1, 0, 0, 0)
        times["test"] = {"value": 31, "unit": "days"}
        end = add_time_interval(start, "test")
        assert end == datetime.datetime(2021, 2, 1, 0, 0, 0)
        times["test"] = {"value": 15, "unit": "months"}
        end = add_time_interval(start, "test")
        assert end == datetime.datetime(2022, 4, 1, 0, 0, 0)


if __name__ == "__main__":
    if "--test" in sys.argv:
        sys.argv.remove("--test")
        unittest.main()

    else:
        logger.info("Startup")
        cleanup_downloads()
        for task in get_open_tasks():
            logger.debug(f"got open task: {task}")
            if task["type"] == "provide_download_link":
                update_task(task, {"status": "processing"})
                provide_download_link(task)
            elif task["type"] == "delete_run":
                if (
                    task["timestamp"]
                    < (add_time_interval(NOW, "deletion_delay")).timestamp()
                ):
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
                if (
                    task["timestamp"]
                    < (add_time_interval(NOW, "deletion_delay")).timestamp()
                ):
                    update_task(task, {"status": "processing"})
                    delete_from_archive(task)
            elif task["type"] == "sort_by_date":
                update_task(task, {"status": "processing"})
                sort_by_date(task)
            elif task["type"] == "send_annotation_email":
                update_task(task, {"status": "processing"})
                send_annotation_email(task)

        send_deletion_warnings()
        send_archive_deletion_warnings()
        discover_runs()
