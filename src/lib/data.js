import {
  add_task,
  isodate_to_timestamp,
  load_archived_runs,
  load_tasks,
	load_runs,
  load_workingdir_runs,
  update_task,
} from "$lib/util";

function runs_to_names(runs) {
  var named = {};
  for (let r of runs) {
    named[r["run"]] = true;
  }
  return named;
}

export async function pending_archivals() {
  let open_tasks = [];
  let tasks = await load_tasks();
  for (let task of tasks) {
    if (
      task["type"] == "archive_run" &&
      (task["status"] == "open" || task["status"] == "processing")
    ) {
      open_tasks.push(task);
    }
  }
  return open_tasks;
}

export async function pending_deletions() {
  let open_deletions = [];
  let tasks = await load_tasks();
  for (let task of tasks) {
    if (
      task["type"] == "delete_run" &&
      (task["status"] == "open" || task["status"] == "processing")
    ) {
      open_deletions.push(task);
    }
  }
  return open_deletions;
}

export async function pending_restores() {
  let open_tasks = [];
  let tasks = await load_tasks();
  for (let task of tasks) {
    if (
      task["type"] == "restore_run" &&
      (task["status"] == "open" || task["status"] == "processing")
    ) {
      open_tasks.push(task);
    }
  }
  return open_tasks;
}

export async function pending_archive_deletions() {
  let open_tasks = [];
  let tasks = await load_tasks();
  for (let task of tasks) {
    if (
      task["type"] == "remove_from_archive" &&
      (task["status"] == "open" || task["status"] == "processing")
    ) {
      open_tasks.push(task);
    }
  }
  return open_tasks;
}

export async function load_archivable_runs() {
  let named_open_tasks = runs_to_names(await pending_archivals());

  let named_archived = runs_to_names(await load_archived_runs());

  let runs = await load_workingdir_runs();
  //filter runs to only those that are not in the process of being deleted
  runs = runs.filter((run) => {
    return named_open_tasks[run.name] == undefined &&
      named_archived[run.name] == undefined;
  });
  runs = runs.map((run, idx) => {
    if (run["annotations"].length > 0) {
      let last = run["annotations"].length - 1;
      let earliest_deletion_timestamp = isodate_to_timestamp(
        run["annotations"]["last"]["deletion_date"],
      );
      run.deleteable =
        earliest_deletion_timestamp < ((new Date().getTime()) / 1000);
      run.archievable = run["annotations"][last]["do_archive"];
    } else {
      run.deleteable = false;
      run.archievable = false;
    }
    return run;
  });

  runs = runs.filter((run) => {
    run.archievable;
  });
  return runs;
}
export async function load_deletable_runs() {
  let named_open_deletions = runs_to_names(await pending_deletions());
  let named_open_archivals = runs_to_names(await pending_archivals());
  let named_archived = runs_to_names(await load_archived_runs());
  let runs = await load_workingdir_runs();
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
      run.earliest_deletion_timestamp = isodate_to_timestamp(
        run["annotations"][last]["deletion_date"],
      );
      if (run.earliest_deletion_timestamp < ((new Date().getTime()) / 1000)) {
        return false;
      }
      run.do_archive = run["annotations"][last]["do_archive"];
      if (run.do_archive) {
        //is it archived already?
        return (named_archived[run.name] != undefined);
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

export async function load_archive_deletable_runs() {
  let named_open_open_deletions = runs_to_names(
    await pending_archive_deletions(),
  );

  let named_open_restores = runs_to_names(await pending_restores());

  let runs = await load_archived_runs();
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
        let end_timestamp = isodate_to_timestamp(
          run.annotations[last].archive_end_date,
        );
        if (end_timestamp < (Date.now() / 1000)) {
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

export async function load_unannoteted_and_unfinished_annotation_runs(runs) {
  var unannotated_runs = runs.filter((run) =>
    run[1]["annotations"].length == 0
  );
  unannotated_runs = Object.fromEntries(unannotated_runs);

  var unfinished = runs.filter((run) =>
    run[1]["in_working_set"] && !run[1]["in_archive"]
	&& (run[1]["annotations"].length > 0)
	&& (!any_finished(run[1]['annotations']))

  );
  unfinished = Object.fromEntries(unfinished);
  return {'unannotated_runs': unannotated_runs, 'unfinished_runs': unfinished};


}

export async function load_todos() {
	var runs = await load_runs();
    runs = Object.entries(runs);

	let uu = await load_unannoteted_and_unfinished_annotation_runs(runs);

	return uu;
}
