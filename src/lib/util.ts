import process from "process";
import fs from "fs";
const { subtle } = globalThis.crypto;
import { add_styles } from "svelte/internal";
import toml from "toml";
import * as EmailValidator from "email-validator";

export function iso_date(date: Date) {
  const isoDate = date.toISOString().split("T")[0];
  return isoDate;
}

export function isodate_to_timestamp(iso: string) {
  //parse iso date YYYY-mm-dd into timestamp
  let re = /(\d+)-(\d+)-(\d+)/;
  let match = re.exec(iso);
  if (match) {
    let year = parseInt(match[1]);
    let month = parseInt(match[2]);
    let day = parseInt(match[3]);
    let date = new Date(year, month - 1, day);
    return date.getTime() / 1000;
  } else {
    throw new Error("Invalid date format");
  }
}

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
    return toIsoStringTZO(date, true);
  } catch (e) {
    return unix_timestamp;
  }
}

export function human_since(days: number) {
  //< 365 days => x days
  //afterwards y years and x days
  let suffix = "";
  if (days < 0) {
    suffix = "in the future";
    days = days * -1;
  } else {
    suffix = "ago";
  }
  if (days < 365) {
    return `${days} days ${suffix}`;
  } else {
    const years = Math.floor(days / 365);
    const rmdays = days % 365;
    return `${years} years and ${rmdays} days ${suffix}`;
  }
}

export function format_date_and_period(unix_timestamp: number) {
  const date = new Date(unix_timestamp * 1000);
  const isoDate = date.toISOString().split("T")[0];
  const days_since = Math.floor((Date.now() - date.getTime()) / 86400000);
  return `${isoDate} (${human_since(days_since)})`;
}

export function event_details(event: object) {
  switch (event.type) {
    /* case "run_discovered":
      return `<b>${event.name}</b><br />Run finish date: ${
        format_timestamp(event.run_finish_date)
      }`;
      break; */
    case undefined:
    default:
      let out = structuredClone(event);
      for (let key in out) {
        if (key.endsWith("_date") || key.endsWith("timestamp")) {
          out[key + "_human"] = format_timestamp(out[key]);
          delete out[key];
        }
      }
      delete out.type;
      delete out.pid;
      return out;
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
    let re = /(\d+)_(\d+)_?(\d+)?\.json/;
    let match = re.exec(file);
    if (match) {
      //read the file
      let raw = await fs.promises.readFile(target_dir + "/" + file);
      try {
        let parsed = JSON.parse(raw);
        let timestamp_int = parseInt(match[1]);
        let pid_int = parseInt(match[2]);
        let count_int = 0;
        try {
          count_int = parseInt(match[3]);
        } catch (e) {
        }
        parsed["timestamp"] = timestamp_int;
        parsed["pid"] = pid_int;
        parsed["count"] = count_int;
        events.push(parsed);
      } catch (e) {
        console.log("Error parsing json file " + file, e);
      }
    }
  }
  //sort by timestamp, then pid
  events.sort(function (a, b) {
    if (a.timestamp == b.timestamp) {
      if (a.pid == b.pid) {
        return a.count - b.count;
      }
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
  //http header for authentificated user or 'web'
  let json = JSON.stringify(data, null, 2);
  //now write it to the file
  await fs.promises.writeFile(filepath, json);
}

export async function add_task(type: string, task: object, user) {
  task["type"] = type;
  task["status"] = "open";
  task["source"] = user;
  await add_json_log("tasks", task);
  await add_event("task_added", { "task": task }, user);
}

export async function update_task(task: object, new_values: object) {
  let out = Object.assign({}, task, new_values);
  let target_dir = process.env.DATA_DIR + "/tasks";
  let filename = `${task.timestamp}_${task.pid}.json`;
  let filepath = `${target_dir}/${filename}`;
  let json = JSON.stringify(out, null, 2);
  await fs.promises.writeFile(filepath, json);
}

export async function add_event(type: string, data: object, user: string) {
  data["type"] = type;
  data["source"] = user;
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
  archive_date?: number;
  archive_size?: number;
  earliest_deletion_timestamp: number;
  sample_sheet?: string;
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
      runs[ev.run] = {
        name: ev.run,
        run_finish_date: ev.run_finish_date,
        download_count: 0,
        in_working_set: true,
        earliest_deletion_timestamp: parseInt(ev.earliest_deletion_timestamp),
        sample_sheet: ev.sample_sheet,
        alignments: [],
        annotations: [],
      };
    } else if (ev.type == "run_download_provided") {
      //g     runs[ev.run]["download_available"] = true;
      //runs[ev.run]["download_name"] = ev.filename;
    } else if (ev.type == "run_download_expired") {
      runs[ev.run]["download_available"] = false;
    } else if (ev.type == "run_downloaded") {
      //runs[ev.run]["download_count"] += 1;
    } else if (ev.type == "run_deleted_from_working_set") {
      runs[ev.run]["in_working_set"] = false;
    } else if (ev.type == "run_restored_to_working_set") {
      runs[ev.run]["in_working_set"] = true;
    } else if (ev.type == "run_archived") {
      runs[ev.run]["in_archive"] = true;
      runs[ev.run]["archive_date"] = ev.archive_date;
      runs[ev.run]["archive_end_date"] = ev.archive_end_date;
      runs[ev.run]["archive_size"] = ev.size;
    } else if (ev.type == "run_deleted_from_archive") {
      runs[ev.run]["in_archive"] = false;
    } else if (ev.type == "alignment_discovered") {
      runs[ev.run]["alignments"].push(ev.alignment);
    } else if (ev.type == "alignment_removed") {
      //remove alignment from list
      let index = runs[ev.run]["alignments"].indexOf(ev.alignment);
      if (index > -1) {
        runs[ev.run]["alignments"].splice(index, 1);
      }
    } else if (ev.type == "run_annotated") {
      runs[ev.run]["annotations"].push(ev.annotation);
    }
  }
  //runs is an object, not an array
  //so we need to sort the keys
  let run_names = Object.keys(runs);
  run_names.sort();
  run_names.reverse();
  let sorted_runs = {};
  for (let run_name of run_names) {
    sorted_runs[run_name] = runs[run_name];
  }
  return sorted_runs;
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
export async function load_archived_runs() {
  let runs = await load_runs();
  //filter to those with in_working_set
  let workingdir_runs = [];
  for (let run_name in runs) {
    if (runs[run_name]["in_archive"] == true) {
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

export function toIsoStringTZO(date, include_time) {
  var tzo = -date.getTimezoneOffset();
  let pad = function (num) {
    return (num < 10 ? "0" : "") + num;
  };

  if (include_time) {
    return (
      date.getFullYear() +
      "-" +
      pad(date.getMonth() + 1) +
      "-" +
      pad(date.getDate()) +
      " " +
      pad(date.getHours()) +
      ":" +
      pad(date.getMinutes()) +
      ":" +
      pad(date.getSeconds())
    );
  } else {
  }

  return (
    date.getFullYear() +
    "-" +
    pad(date.getMonth() + 1) +
    "-" +
    pad(date.getDate())
  );
}

export async function pending_sorts() {
  let open_tasks = [];
  let tasks = await load_tasks();
  for (let task of tasks) {
    if (
      task["type"] == "sort_by_date" &&
      (task["status"] == "open" || task["status"] == "processing")
    ) {
      open_tasks.push(task);
    }
  }
  return open_tasks;
}

export async function load_template(name: string, default_text: string) {
  let events = await load_events();
  let result = default_text;
  for (let ev of events) {
    if ((ev.type == "template_changed") && (ev.name == name)) {
      result = ev.text;
    }
  }
  return result;
}

export async function save_template(
  name: string,
  template: string,
  user: string,
): Promise<Boolean> {
  let old_template = await load_template(name, "");
  if (old_template != template) {
    await add_event("template_changed", {
      "name": name,
      "text": template,
    }, user);
    return true;
  } else {
    return false;
  }
}

export function plus_days(date: Date, days: number) {
  const new_date = new Date(date);
  new_date.setDate(new_date.getDate() + days);
  return new_date;
}

export function plus_months(date: Date, months: number) {
  const new_date = new Date(date);
  new_date.setMonth(new_date.getMonth() + months);
  return new_date;
}

export function plus_years(date: Date, years: number) {
  const new_date = new Date(date);
  new_date.setFullYear(new_date.getFullYear() + years);
  return new_date;
}

export function date_min(dateA: Date, dateB: Date) {
  if (dateA == null) {
    return dateB;
  }
  if (dateB == null) {
    return dateA;
  }
  if (dateA < dateB) {
    return dateA;
  } else {
    return dateB;
  }
}

export function check_emails(newline_seperarated_addreses: string): [string] {
  let nsa = newline_seperarated_addreses.trim();
  if (
    (nsa.length == 0) ||
    (nsa.indexOf("@") == -1)
  ) {
    throw new Error("Receivers did not contain an @");
  }
  let individuals = nsa.split("\n");
  let receivers = [];
  for (let individual of individuals) {
    individual = individual.trim();
    if (individual.length != 0) {
      if (!EmailValidator.validate(individual)) {
        throw new Error("Invalid email address: '" + individual + "'");
      }
      receivers.push(individual);
    }
  }
  return receivers;
}

export function load_times() {
  let toml_str = fs.readFileSync("./static/times.toml").toString();
  let times = toml.parse(toml_str);
  return times;
}

export function add_time_interval(
  start_time: Date,
  interval_name: string,
  times,
) {
  let unit = times[interval_name]["unit"];
  let value = times[interval_name]["value"];
  if (unit == "seconds") {
    return new Date(start_time.getTime() + value * 1000);
  } else if (unit == "minutes") {
    return new Date(start_time.getTime() + value * 1000 * 60);
  } else if (unit == "hours") {
    return new Date(start_time.getTime() + value * 1000 * 60 * 60);
  } else if (unit == "days") {
    return new Date(start_time.getTime() + value * 1000 * 60 * 60 * 24);
  } else if (unit == "weeks") {
    return new Date(start_time.getTime() + value * 1000 * 60 * 60 * 24 * 7);
  } else if (unit == "months") {
    return plus_months(start_time, value);
  } else if (unit == "years") {
    return plus_years(start_time, value);
  }
}
