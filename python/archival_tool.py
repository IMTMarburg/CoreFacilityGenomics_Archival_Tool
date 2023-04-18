import shutil
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

default_template = "Your download is available at %URL%."

download_cleanup_timeout_seconds = 3600 * 24 * 31

_events = None


def load_events():
    global _events
    if _events is None:
        events = []
        for filename in event_dir.glob("*.json"):
            try:
                timestamp, pid = re.match(r"(\d+)_(\d+).json", filename.name).groups()
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


def add_event(event):
    global last_event_time
    if last_event_time != None:
        if time.time() - last_event_time < 2:
            time.sleep(2)
    filename = event_dir / f"{int(time.time())}_{os.getpid()}.json"
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


def find_last_provided_download(run):
    last_provided_download = None
    for event in load_events():
        if event.get("type", "") == "run_download_provided" and event["run"] == run:
            last_provided_download = event["filename"]
        # can't do it like that because of the nesting
        # elif event['type'] == "run_download_removed" and event['run'] == run:
        # last_provided_download = None
    print("last provided", last_provided_download)
    if last_provided_download and (download_dir / last_provided_download).exists():
        return last_provided_download
    else:
        return None


def tar_output_folder(input_folder, output_file, exclude_data_folder=False):
    # tar,b tu execlude the Data folder.
    cmd = [
        "tar",
        "-I",
        'zstd', 
        "-cf",
        str(output_file.absolute()),
        str(input_folder.name),
    ]
    print(cmd)
    if exclude_data_folder:
        cmd.insert(1, ["--exclude", "Data"])
    subprocess.check_call(cmd, cwd=input_folder.parent)


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
    tar_cmd = ["tar", "--exclude", "Data", "--use-compress-program", 'zstd -19', "-c", str(input_folder.name)]
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
        with open("key", "wb") as tf:
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
            tar_cmd = ["tar", "--zstd", "x"]
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


def find_run(run):
    candidate = working_dir / run
    if candidate.exists():
        return candidate
    else:
        for rta_complete in working_dir.glob("**/RTAComplete.txt"):
            if rta_complete.parent.name == run:
                return rta_complete.parent
    raise ValueError("Not found")


def get_template():
    path = data_dir / "template.txt"
    try:
        return path.read_text()
    except:
        return default_template


def send_email(receivers, filename):
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
    msg = MIMEText(message)
    msg["Subject"] = "Sequencing run finished"
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
    output_name = (
        time.strftime("%Y-%m-%d_%H-%M-%S_")
        + safe_name(task["run"])
        + "_"
        + random_text(5)
        + ".tar.zstd"
    )
    last_provided_download = find_last_provided_download(task["run"])
    try:
        if last_provided_download:
            os.link(download_dir / last_provided_download, download_dir / output_name)
        else:
            tar_output_folder(find_run(task["run"]), download_dir / output_name)
        if task["receivers"]:
            try:
                email = send_email(task["receivers"], output_name)
                email_success = "Mail sent:\n " + email
            except Exception as e:
                email_success = f"Sent failed: {e}"
                raise
        else:
            email_success = "No receivers"
        add_event(
            {
                "type": "run_download_provided",
                "run": task["run"],
                "filename": str(output_name),
                "finish_time": int(time.time()),
                "details": {"receivers": task["receivers"]},
                "email_success": email_success,
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
    for filename in download_dir.glob("*.tar.zstd"):
        match = re.match(
            r"(\d\d\d\d-\d\d-\d\d_\d\d-\d\d-\d\d)_(.*)\.tar\.zstd", filename.name
        )
        str_date = match.group(1)
        run = match.group(2)
        date = datetime.datetime.strptime(str_date, "%Y-%m-%d_%H-%M-%S")
        delta = datetime.datetime.now() - date
        if delta.total_seconds() > download_cleanup_timeout_seconds:
            print("Delete download", filename)
            filename.unlink()
            add_event(
                {
                    "type": "run_download_removed",
                    "filename": str(filename.name),
                    "run": run,
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
        #print("no match in", input_str)
        return extract_american_date_and_convert_to_unix_timestamp_format2(input_str)

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
        print("no match for either date format in", input_str)
        return None
    date_obj = datetime.datetime.strptime(date_match.group(0), "%m/%d/%Y,%H:%M:%S.%f")
    timestamp = int(time.mktime(date_obj.timetuple()))
    return timestamp


def discover_runs():
    ever = set()
    current = set()
    for event in load_events():
        t = event.get("type", "")
        if t == "run_discovered" or t == "run_restored_to_working_set":
            ever.add(event["run"])
            current.add(event["run"])
        elif t == "run_deleted_from_working_set":
            current.remove(event["run"])
    for rta_complete in working_dir.glob("**/RTAComplete.txt"):
        run = rta_complete.parent.name
        run_finish_date = extract_american_date_and_convert_to_unix_timestamp(
            rta_complete.read_text()
        )
        if not run_finish_date:
            raise ValueError()
        if run not in ever:
            add_event(
                {
                    "type": "run_discovered",
                    "run": str(run),
                    "run_finish_date": run_finish_date,
                }
            )
        elif run not in current:
            add_event({"type": "run_restored_to_working_set", "run": str(run)})


def delete_run(task):
    source = find_run(task["run"])
    target = deleted_dir / task["run"]
    shutil.copytree(source, target, dirs_exist_ok=True)
    shutil.rmtree(source)
    add_event({"type": "run_deleted_from_working_set", "run": task["run"]})
    update_task(
        task,
        {
            "status": "done",
            "finish_time": int(time.time()),
        },
    )


def archive_run(task):
    source = find_run(task["run"])
    source_folder = str(source.relative_to(working_dir))
    target = archived_dir / (safe_name(task["run"]) + ".tar.zstd.age")
    key, size = tar_and_encrypt(source, target)
    add_event(
        {
            "type": "run_archived",
            "run": task["run"],
            "archive_date": int(time.time()),
            "source_folder": source_folder,
            "filename": target.name,
            "size": size,
            "key": key,
        }
    )


def unarchive_run(task):
    events = load_events()
    for ev in reversed(events):
        if ev["type"] == "run_archived" and ev["run"] == task["run"]:
            source = ev["filename"]
            key = ev["key"]
            target = working_dir / task["source_folder"]
            target.parent.mkdir(exist_ok=True, parents=True)
            if target.exists():
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
    raise ValueError("could not find archive event")
    update_task(task, {"status": "failed", "reason": "could not find archive event"})


for task in get_open_tasks():
    print(task)
    if task["type"] == "provide_download_link":
        update_task(task, {"status": "processing"})
        provide_download_link(task)
    elif task["type"] == "delete_run":
        update_task(task, {"status": "processing"})
        delete_run(task)
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

cleanup_downloads()
discover_runs()
