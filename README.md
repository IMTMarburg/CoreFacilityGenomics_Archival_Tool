# sveltekit-nix

Reproducible builds for Sveltekit using Nix flakes.

## One-liner for testing

```
ORIGIN=http://localhost:3000 nix run github:knarkzel/sveltekit-nix
```

## Development

```
cd ./
nix develop
# now something like this to run the webserver.
./test_js.sh
(port / url will be printed)

# and something like this to run the background task
./test_python.sh
```
