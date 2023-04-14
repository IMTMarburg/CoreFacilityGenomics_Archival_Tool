import shutil
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
event_dir = Path(os.environ["DATA_DIR"]) / "events"
task_dir = Path(os.environ["DATA_DIR"]) / "tasks"

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
        "-czf",
        str(output_file.absolute()),
        str(input_folder.name),
    ]
    print(cmd)
    if exclude_data_folder:
        cmd += ["--exclude", "Data"]
    subprocess.check_call(cmd, cwd=input_folder.parent)


def find_run(run):
    candidate = working_dir / run
    if candidate.exists():
        return candidate
    else:
        for rta_complete in working_dir.glob("**/RTAComplete.txt"):
            if rta_complete.parent.name == run:
                return rta_complete.parent
    raise ValueError("Not found")


def provide_download_link(task):
    output_name = (
        time.strftime("%Y-%m-%d_%H-%M-%S_")
        + safe_name(task["run"])
        + "_"
        + random_text(5)
        + ".tar.gz"
    )
    last_provided_download = find_last_provided_download(task["run"])
    try:
        if last_provided_download:
            os.link(download_dir / last_provided_download, download_dir / output_name)
        else:
            tar_output_folder(find_run(task["run"]), download_dir / output_name)
        add_event(
            {
                "type": "run_download_provided",
                "run": task["run"],
                "filename": str(output_name),
            }
        )
        update_task(task, {"status": "done", "filename": output_name})
    except Exception as e:
        update_task(task, {"status": "failed", "msg": str(e)})


def cleanup_downloads():
    for filename in download_dir.glob("*.tar.gz"):
        match = re.match(
            r"(\d\d\d\d-\d\d-\d\d_\d\d-\d\d-\d\d)_(.*)\.tar\.gz", filename.name
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
        print("no match in", input_str)
        return None

    # Extract the date string from the regex match
    date_str = date_match.group(0)

    # Parse the date string into a datetime object
    date_obj = datetime.datetime.strptime(date_str, "%m/%d/%Y %I:%M:%S %p")

    # Convert the datetime object to a Unix timestamp
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


for task in get_open_tasks():
    print(task)
    if task["type"] == "provide_download_link":
        update_task(task, {"status": "processing"})
        provide_download_link(task)


cleanup_downloads()
discover_runs()
