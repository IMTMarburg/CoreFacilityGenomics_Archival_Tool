import subprocess
from pathlib import Path
import shutil

if Path("data").exists():
    shutil.rmtree("data")
if Path("runs").exists():
    #shutil.rmtree("runs")
    pass

for x in [
    "data/events",
    "data/tasks",
    "runs/downloads",
    "runs/deleted",
    "runs/working",
    "runs/archive",
]:
    Path(x).mkdir(parents=True, exist_ok=True)

runs = [
    "221025_NB552003_0189_AHKFNYBGXM",
    "221103_NB552003_0193_AHK7NWBGXM",
    "221212_M03491_0020_000000000-KM2H3",
]

for r in runs:
    dir = "20" + r[:2]
    source = Path("rose:/rose/ffs/incoming/") / dir / r
    excludes = ["*.fastq.gz", "*.locs", "*.bcl.bgzf*", "*.filter", '*.bcl', '*.stats']
    cmd = ["rsync", source, "runs/working/" + r, "-Pr", "--exclude=*.jpg"]
    cmd += ["--exclude=" + x for x in excludes]
    subprocess.check_call(cmd)
    counter = 0
    for glob in excludes:
        for fn in source.glob(glob):
            counter += 1
            assert not fn.is_absolute()
            out_fn = Path("runs/working/" + r) / fn
            out_fn.write_text(str(counter))
