{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-26.05";
    flake-utils.url = "github:numtide/flake-utils";
    gitignore = {
      url = "github:hercules-ci/gitignore.nix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs =
    {
      self,
      nixpkgs,
      gitignore,
      flake-utils,
      ...
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        packageJSON = pkgs.lib.importJSON ./package.json;
        gitignoreSource = gitignore.lib.gitignoreSource;
      in
      rec {
        packages = rec {
          site-src = pkgs.stdenv.mkDerivation (finalAttrs: rec {
            name = "${packageJSON.name}-site-${version}";
            version = packageJSON.version;
            src = gitignoreSource ./.;
            distPhase = "true";
            yarnOfflineCache = pkgs.fetchYarnDeps {
              yarnLock = finalAttrs.src + "/yarn.lock";
              sha256 = "sha256-gSHJ/+QARJbBa9EC28UX9xIdu2An00htCmih7x9s8sU=";
            };
            yarnBuildScript = "build";
            nativeBuildInputs = [
              pkgs.yarnConfigHook
              pkgs.yarnBuildHook
              # Needed for executing package.json scripts
              pkgs.nodejs
              pkgs.npmHooks.npmInstallHook
            ];
            installPhase = ''
              runHook preInstall

              mkdir -p $out

              # adjust depending on your build output
              cp -r build $out/
              cp -r node_modules $out/

              runHook postInstall
            '';
          });

          default = pkgs.writeShellApplication {
            name = packageJSON.name;
            runtimeInputs = [
              site-src
              pkgs.nodejs
              pkgs.rage
            ];
            text = ''
              export TEMPLATES_PATH=${./static/mail_templates.toml}
              export TIMES_PATH=${./static/times.toml}

              node ${site-src}/build
            '';
          };
          cfgat_archival_worker =
            let
              pymeta3 = pkgs.python3Packages.buildPythonPackage rec {
                pname = "PyMeta3";
                version = "0.5.1";
                src = pkgs.python3Packages.fetchPypi {
                  inherit pname version;
                  sha256 = "sha256-GL2jJtmpu/WHv8DuC8loZJZNeLBnKIvPVdTZhoHQW8s=";
                };
                propagatedBuildInputs = [ pkgs.python3Packages.twisted ];
                doCheck = false;
                build-system = [ pkgs.python3Packages.setuptools ];
                pyproject = true;
              };
              pybars = pkgs.python3Packages.buildPythonPackage rec {
                pname = "pybars";
                version = "0.9.7";
                src = pkgs.fetchFromGitHub {
                  owner = "wbond";
                  repo = "pybars3";
                  rev = "0.9.7";
                  inherit pname version;
                  sha256 = "sha256-xYsuo1liGA45yus90NVCeF1xrn4YQlFuCWiDvCGf2os=";
                };
                doCheck = false;
                propagatedBuildInputs = [ pymeta3 ];
                build-system = [ pkgs.python3Packages.setuptools ];
                pyproject = true;
              };
              mypython = pkgs.python3.withPackages (p: [
                pybars
                p.toml
                p.python-dateutil
                p.loguru
              ]);
            in
            pkgs.writeShellApplication {
              name = "cfgat_archival_worker";
              runtimeInputs = [ mypython ];
              text = ''
                export TEMPLATES_PATH=${./static/mail_templates.toml}
                export TIMES_PATH=${./static/times.toml}
                export PATH="$PATH:${pkgs.bash.out}/bin/:${pkgs.curl.bin}/bin/:${pkgs.coreutils}/bin:${pkgs.jq}/bin:${pkgs.wget}/bin"
                ${mypython}/bin/python "''${1:-${./python/archival_tool.py}}"
              '';
            };
        };

        devShell = pkgs.mkShell {
          buildInputs = [
            pkgs.yarn
            pkgs.nodejs
            pkgs.rage
            packages.cfgat_archival_worker
          ];
          shellHook = ''
            export PATH=$PATH:$(pwd)/node_modules/.bin/
            export TEMPLATES_PATH=$(pwd)/static/mail_templates.toml
            export TIMES_PATH=$(pwd)/static/times.toml
          '';
        };
      }
    );
}
