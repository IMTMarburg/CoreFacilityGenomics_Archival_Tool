<script lang="ts">
	export let data;
</script>

<h1>Set a fake date (for this browser session)</h1>

<form method="POST" action="?/set_fake_date">

	<label for="fake_date">Fake date</label>
	<input type="date" name="fake_date" id="fake_date" value={data.fake_date} />
	
	<input type="submit" name="submit" value="Set"/>
	<input type="submit" name="submit" value="Clear fake date"/>
</form>
