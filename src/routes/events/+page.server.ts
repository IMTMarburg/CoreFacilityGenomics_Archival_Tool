

import {load_events} from '$lib/util';

export async function load() {
	let events = await load_events();
	events.reverse();
	//extract unique ['type'] values from events
	let event_types = [... new Set(events.map(ev => ev['type']))];
	let event_sources = [... new Set(events.map(ev => ev['source']))];
	event_types.sort();
	event_sources.sort();
  return {
	  events, 
	  event_types,
	  event_sources,
  };
}
