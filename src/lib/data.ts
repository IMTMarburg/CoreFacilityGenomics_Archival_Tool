import process from "process";
import fs from "fs";
import { get_now, runs_to_names } from "$lib/util";

var event_cache = {};
//if this ever get's too slow
//we'll need to aggregate / prepropcess a few 10k events inot their own file...
async function load_json_log(key: string) {
  let target_dir = process.env.DATA_DIR + "/" + key;
  //now for each json file in target_dir
  //parse filename into timestamp_pid.json
  //read file, parse json, add timestamp = timestamp,
  if (!event_cache[key]) {
    event_cache[key] = { last: "", events: [] };
  }

  let events = event_cache[key].events;
  console.log("readdir", key, event_cache[key].last);
  var files = await fs.promises.readdir(target_dir);
  files = files.filter((file) => event_cache[key].last < file);
  console.log("Stop read dir", files.length);
  for (const file of files) {
    //console.log(file);
    let re = /(\d+)_(\d+)_?j?(\d+)?\.json/;
    let match = re.exec(file);
    if (match) {
      if (event_cache[key].last < file) {
        event_cache[key].last = file;
      }
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
          //cut off first character
          count_int = parseInt(match[3].substr(1));
        }
        parsed["timestamp"] = timestamp_int;
        parsed["pid"] = pid_int;
        parsed["count"] = count_int;
        parsed["filename"] = file;
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
  event_cache[key].events = events;
  return events;
}

export async function load_events() {
  return await load_json_log("events");
}

export async function load_tasks() {
  return await load_json_log("tasks");
}

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
      runs[ev.run]["deletion_date"] = ev.deletion_date;
    } else if (ev.type == "run_restored_to_working_set") {
      runs[ev.run]["in_working_set"] = true;
      delete runs[ev.run]["deletion_date"];
    } else if (ev.type == "run_archived") {
      runs[ev.run]["in_archive"] = true;
      runs[ev.run]["archive_date"] = ev.archive_date;
      runs[ev.run]["archive_size"] = ev.size;
    } else if (ev.type == "run_deleted_from_archive") {
      runs[ev.run]["in_archive"] = false;
      runs[ev.run]["archive_deletion_date"] = ev.archive_deletion_date;
    } else if (ev.type == "alignment_discovered") {
      runs[ev.run]["alignments"].push(ev.alignment);
    } else if (ev.type == "alignment_removed") {
      //remove alignment from list
      let index = runs[ev.run]["alignments"].indexOf(ev.alignment);
      if (index > -1) {
        runs[ev.run]["alignments"].splice(index, 1);
      }
    } else if (ev.type == "run_annotated") {
      runs[ev.run]["annotations"].push(ev);
    } else if (ev.type == "deletion_warning_sent") {
      runs[ev.info.RUN_NAME ?? ev.info.RUN]["deletion_warning_sent"] = true;
    } else if (ev.type == "archive_deletion_warning_sent") {
      runs[ev.info.RUN_NAME ?? ev.info.RUN]["archive_deletion_warning_sent"] =
        true;
    }
  }
  //runs is an object, not an array
  //so we need to sort the keys
  let run_names = Object.keys(runs);
  run_names.sort();
  run_names.reverse();
  let sorted_runs = [];
  for (let run_name of run_names) {
    sorted_runs.push(runs[run_name]);
  }
  return sorted_runs;
}

export function pending_archivals(tasks) {
  return tasks.filter((task) =>
    task["type"] == "archive_run" && task["status"] == "open" ||
    task["status"] == "processing"
  );
}

export function pending_deletions(tasks) {
  return tasks.filter((task) =>
    task["type"] == "delete_run" && task["status"] == "open" ||
    task["status"] == "processing"
  );
}

export function pending_restores(tasks) {
  return tasks.filter((task) =>
    task["type"] == "restore_run" && task["status"] == "open" ||
    task["status"] == "processing"
  );
}

export function pending_archive_deletions(tasks) {
  return tasks.filter((task) =>
    task["type"] == "remove_from_archive" && task["status"] == "open" ||
    task["status"] == "processing"
  );
}

export function pending_sorts(tasks) {
  return tasks.filter((task) =>
    task["type"] == "sort_by_date" && task["status"] == "open" ||
    task["status"] == "processing"
  );
}

function runs_where_x_is_true(run_list, x) {
  return run_list.filter((run) => {
    return run[x];
  });
}

export function runs_where_deletion_warnings_have_been_sent(run_list) {
  return runs_where_x_is_true(run_list, "deletion_warning_sent");
}

export function runs_where_archive_deletion_warnings_have_been_sent(
  run_list,
) {
  return runs_where_x_is_true(run_list, "archive_deletion_warning_sent");
}

export function runs_in_working_set(run_list) {
  return runs_where_x_is_true(run_list, "in_working_set");
}

export function runs_in_archive(run_list) {
  return runs_where_x_is_true(run_list, "in_archive");
}

export function runs_can_be_archived(cookies, run_list, tasks) {
  let named_open_tasks = runs_to_names(pending_archivals(tasks));
  let named_archived = runs_to_names(runs_in_archive(run_list));
  let named_deletion_warnings_sent =
    runs_where_deletion_warnings_have_been_sent(run_list);

  let runs = runs_in_working_set(run_list);
  //filter runs to only those that are not in the process of being archived
  //or have been archived before
  runs = runs.filter((run) => {
    return named_open_tasks[run.name] == undefined &&
      named_archived[run.name] == undefined;
  });

  runs = runs.map((run, idx) => {
    if (run["annotations"].length > 0) {
      let last = run["annotations"].length - 1;
      let earliest_deletion_timestamp =
        run["annotations"][last]["deletion_date"];
      run.deleteable = earliest_deletion_timestamp < get_now(cookies);
      run.archievable = run["annotations"][last]["do_archive"] &&
        run.deleteable &&
        (named_deletion_warnings_sent[run.name] != undefined);
    } else {
      run.deleteable = false;
      run.archievable = false;
    }
    return run;
  });
  runs = runs.filter((run) => {
    return run.archievable;
  });
  return runs;
}
export function runs_can_be_deleted(cookies, run_list, tasks) {
  let named_open_deletions = runs_to_names(pending_deletions(tasks));
  let named_open_archivals = runs_to_names(pending_archivals(tasks));
  let named_archived = runs_to_names(runs_in_archive(run_list));
  let named_deletion_warnings_sent =
    runs_where_deletion_warnings_have_been_sent(run_list);

  let runs = runs_in_working_set(run_list);
  // filter runs to only those that are not in the process of being deleted
  // or achived
  runs = runs.filter((run) => {
    return named_open_deletions[run.name] == undefined &&
      named_open_archivals[run.name] == undefined;
  });
  runs.sort((a, b) => {
    a["name"].localeCompare(b["name"]);
  });
  let deletable = runs.filter((run) => {
    if (run["annotations"].length > 0) {
      let last = run["annotations"].length - 1;
      run.earliest_deletion_timestamp =
        run["annotations"][last]["deletion_date"];
      if (run.earliest_deletion_timestamp > get_now(cookies)) {
        return false;
      }
      run.do_archive = run["annotations"][last]["do_archive"];
      if (named_deletion_warnings_sent[run.name] == undefined) { //don't without a deletion warning having been sent.
        return false;
      }
      if (run.do_archive) {
        //is it archived already?
        return run.in_archive;
      } else {
        return true; //we already have checked the date
      }
    } else {
      return false;
    }
    return run.earliest_deletion_timestamp < ((new Date().getTime()) / 1000);
  });

  return deletable;
}

export function runs_can_be_deleted_from_archive(cookies, run_list, tasks) {
  let named_open_open_deletions = runs_to_names(
    pending_archive_deletions(tasks),
  );
  let named_open_restores = runs_to_names(pending_restores(tasks));
  let named_archive_deletion_warnings_sent =
    runs_where_archive_deletion_warnings_have_been_sent(run_list);

  let runs = runs_in_archive(run_list);
  //filter runs to only those that are not in the process of being deleted
  runs = runs.filter((run) => {
    if (named_open_open_deletions[run.name] != undefined) {
      return false;
    }
    if (named_open_restores[run.name] != undefined) {
      return false;
    }

    if (run.in_archive) {
      if (run.annotations.length > 0) {
        let last = run.annotations.length - 1;
        let end_timestamp = run.annotations[last].archive_deletion_date;
        console.log(run.annotations[last]);
        if (
          (end_timestamp < get_now(cookies)) &&
          (named_archive_deletion_warnings_sent[run.name] != undefined)
        ) {
          return true;
        }
      } else {
        return false;
      }
    } else {
      return false;
    }
  });
  return runs;
}

export function any_finished(annotations) {
  //write to stdout
  for (var idx in annotations) {
    if (annotations[idx]["run_finished"]) {
      return true;
    }
  }
  return false;
}

export function runs_unannotated(run_list) {
  return run_list.filter((run) => run["annotations"].length == 0);
}

export function runs_annotation_unfinished(run_list) {
  {
    return run_list.filter((run) =>
      run["in_working_set"] && !run["in_archive"] &&
      (run["annotations"].length > 0) &&
      (!any_finished(run["annotations"]))
    );
  }
}
export async function load_todos(cookies) {
  var run_list = await load_runs(); // this is a 'sorted object'
  var tasks = await load_tasks();

  let res = {
    "no annotation": runs_unannotated(run_list),
    "unfinished annotion": runs_annotation_unfinished(run_list),
    "archive": runs_can_be_archived(cookies, run_list, tasks),
    "delete": runs_can_be_deleted(cookies, run_list, tasks),
    "delete_from_archive": runs_can_be_deleted_from_archive(
      cookies,
      run_list,
      tasks,
    ),
  };

  return res;
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
  subject: string,
  user: string,
): Promise<Boolean> {
  let old_template = await load_template(name, "");
  if (old_template != template) {
    await add_event("template_changed", {
      "name": name,
      "text": template,
      "subject": subject,
    }, user);
    return true;
  } else {
    return false;
  }
}

var last_added_json_timestamps = {};

async function add_json_log(key: string, data: object) {
  if (last_added_json_timestamps[key] == undefined) {
    last_added_json_timestamps[key] = {};
  }
  let target_dir = process.env.DATA_DIR + "/" + key;
  let timestamp = Math.floor(Date.now() / 1000);
  let counter = last_added_json_timestamps[key][timestamp] ?? 0;
  last_added_json_timestamps[key][timestamp] = counter + 1;
  let pid = process.pid;
  let filename = `${timestamp}_${pid}_j${counter}.json`;
  let filepath = `${target_dir}/${filename}`;
  //http header for authentificated user or 'web'
  let json = JSON.stringify(data, null, 2);
  //now write it to the file
  await fs.promises.writeFile(filepath, json);
  //now delete all from last_added_json_timestamps where timestamp is not this timestamp
  for (let ts in last_added_json_timestamps[key]) {
    if (ts != timestamp) {
      delete last_added_json_timestamps[key][ts];
    }
  }
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
  let filename = task.filename;
  let filepath = `${target_dir}/${filename}`;
  let json = JSON.stringify(out, null, 2);
  await fs.promises.writeFile(filepath, json);
}

export async function add_event(type: string, data: object, user: string) {
  data["type"] = type;
  data["source"] = user;
  add_json_log("events", data);
}
