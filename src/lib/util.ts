import process from "process";
import fs from "fs";
const { subtle } = globalThis.crypto;
import { add_styles } from "svelte/internal";

export function iso_date_and_time(input_date: Date) {
  let date = new Date(input_date);
  const isoTime = date.toISOString().split("T")[1].split(".")[0];
  const hours = isoTime.substr(0, 2);
  const minutes = isoTime.substr(3, 2);
  const isoDate = date.toISOString().split("T")[0];
  return `${isoDate} ${hours}:${minutes}`;
}

export function format_timestamp(unix_timestamp: number) {
  const date = new Date(unix_timestamp * 1000);
  try {
    return iso_date_and_time(date);
  } catch (e) {
    return unix_timestamp;
  }
}

export function event_details(event: object) {
  switch (event.type) {
    case "run_discovered":
      return `<b>${event.name}</b><br />Run finish date: ${
        format_timestamp(event.run_finish_date)
      }`;
      break;
    case undefined:
    default:
      return JSON.stringify(event, null, 2).replaceAll("\n", "<br />");
      break;
  }
}

export async function load_events() {
  return await load_json_log("events");
}
export async function load_tasks() {
  return await load_json_log("tasks");
}

async function load_json_log(key: string) {
  let target_dir = process.env.DATA_DIR + "/" + key;
  //now for each json file in target_dir
  //parse filename into timestamp_pid.json
  //read file, parse json, add timestamp = timestamp,

  let events = [];
  const files = await fs.promises.readdir(target_dir);
  for (const file of files) {
    let re = /(\d+)_(\d+)\.json/;
    let match = re.exec(file);
    if (match) {
      //read the file
      let raw = await fs.promises.readFile(target_dir + "/" + file);
      let parsed = JSON.parse(raw);
      let timestamp_int = parseInt(match[1]);
      let pid_int = parseInt(match[2]);
      parsed["timestamp"] = timestamp_int;
      parsed["pid"] = pid_int;
      events.push(parsed);
    }
  }
  //sort by timestamp, then pid
  events.sort(function (a, b) {
    if (a.timestamp == b.timestamp) {
      return a.pid - b.pid;
    }
    return a.timestamp - b.timestamp;
  });
  return events;
}

export async function add_json_log(key: string, data: object) {
  let target_dir = process.env.DATA_DIR + "/" + key;
  let timestamp = Math.floor(Date.now() / 1000);
  let pid = process.pid;
  let filename = `${timestamp}_${pid}.json`;
  let filepath = `${target_dir}/${filename}`;
  let json = JSON.stringify(data, null, 2);
  //now write it to the file
  await fs.promises.writeFile(filepath, json);
}

export async function add_task(type: string, task: object) {
  task["type"] = type;
  task["status"] = "open";
  await add_json_log("tasks", task);
  await add_event("task_added", {'task': task});
}

export async function add_event(type: string, data: object) {
  data["type"] = type;
  add_json_log("events", data);
}

interface Run {
  name: string;
  download_available?: boolean;
  download_name?: string;
  run_finish_date?: number;
  download_count: number;
  in_working_set: boolean;
  in_archive?: boolean;
}

type RunMap = {
  [name: string]: Run;
};

export async function load_runs() {
  let events = await load_events();

  let runs: RunMap = {};
  //group events by run
  for (let ev of events) {
    if (ev.type == "run_discovered") {
      runs[ev.name] = {
        name: ev.name,
        run_finish_date: ev.run_finish_date,
        download_count: 0,
        in_working_set: true,
      };
    } else if (ev.type == "run_download_provided") {
      runs[ev.name]["download_available"] = true;
      runs[ev.name]["download_name"] = ev.download_name;
    } else if (ev.type == "run_download_expired") {
      runs[ev.name]["download_available"] = false;
    } else if (ev.type == "run_downloaded") {
      runs[ev.name]["download_count"] += 1;
    } else if (ev.type == "run_deleted_from_working_set") {
      runs[ev.name]["in_working_set"] = false;
    } else if (ev.type == "run_restored_to_working_set") {
      runs[ev.name]["in_working_set"] = true;
    } else if (ev.type == "run_archived") {
      runs[ev.name]["in_archive"] = true;
    } else if (ev.type == "run_deleted_from_archive") {
      runs[ev.name]["in_archive"] = false;
    }
  }
  return runs;
}

export async function load_workingdir_runs() {
  let runs = await load_runs();
  //filter to those with in_working_set
  let workingdir_runs = [];
  for (let run_name in runs) {
    if (runs[run_name]["in_working_set"]) {
      workingdir_runs.push(runs[run_name]);
    }
  }
  return workingdir_runs;
}

export async function hash_string(message: string): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return hash;
}
