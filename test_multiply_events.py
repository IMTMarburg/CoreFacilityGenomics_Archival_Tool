event_count = 100.00
import json
from pathlib import Path
import random


def ok_event(fn):
    data = json.loads(fn.read_text())
    return data['type'] in [
            'task_added',
            #'deletion_warning_sent',
            #'run_annotated',
            'run_download_provided',
            #'run_download_removed'
            "email_sent",
            #"archive_deletion_warning_sent",
            ]

events = [x for x in (Path("data/events").glob("*.json"))]

count = len(events) -1

while count < event_count:
    nf = f"0691734943_999_{count}.json"
    input = {
            'type': 'fake-event',
            'data': ["xyz" * 300] * 10
            }
    output = Path("data/events") / nf
    output.write_text(json.dumps(input))
    count += 1


if False:
    def ok_task(fn):
        data = json.loads(fn.read_text())
        return data['status'] == 'done'

    tasks = [x for x in (Path("data/tasks").glob("*.json")) if ok_task(x)]

    count = len(tasks)
    while count < event_count:
        nf = f"0691734943_999_{count}.json"
        input = random.choice(tasks)
        output = Path("data/tasks") / nf
        output.write_text(input.read_text())
        count += 1



