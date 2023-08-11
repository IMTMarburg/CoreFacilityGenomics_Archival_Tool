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
  if (iso == null) {
    return null;
  }
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

export function get_now(cookies) {
  //is cookies a string?
  if (typeof cookies == "string") { //see DatePeriod Component
    return isodate_to_timestamp(cookies);
  }
  if (cookies != null && cookies.get("fake_date") != undefined) {
    return isodate_to_timestamp(cookies.get("fake_date"));
  } else {
    return Date.now() / 1000;
  }
}

export function last_annotation(run, key) {
  if (run.annotations == undefined || run.annotations.length == 0) {
    return null;
  }
  let last = run.annotations[run.annotations.length - 1];
  if (last == -1) {
    return null;
  }
  return run.annotations[run.annotations.length - 1][key];
}

export function runs_to_names(runs) {
  var named = {};
  for (let r of runs) {
    if (r["run"] != undefined) {
      named[r["run"]] = true;
    } else if (r["name"] != undefined) {
      named[r["name"]] = true;
    } else {
      throw new Error("Run had neither name nor run.");
    }
  }
  return named;
}

export function contains_all_words(haystack: string, needle: string) {
  let haystack2 = haystack.toLowerCase();
  let needle2 = needle.toLowerCase();
  let words = needle2.split(" ");
  for (let word of words) {
    if (haystack2.indexOf(word) == -1) {
      return false;
    }
  }
  return true;
}
