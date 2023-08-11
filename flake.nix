{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-22.11";
    flake-utils.url = "github:numtide/flake-utils";
    gitignore = {
      url = "github:hercules-ci/gitignore.nix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = {
    self,
    nixpkgs,
    gitignore,
    flake-utils,
    ...
  }:
    flake-utils.lib.eachDefaultSystem (
      system: let
        pkgs = nixpkgs.legacyPackages.${system};
        packageJSON = pkgs.lib.importJSON ./package.json;
        gitignoreSource = gitignore.lib.gitignoreSource;
      in rec {
        packages = rec {
          site-src = pkgs.mkYarnPackage rec {
            name = "${packageJSON.name}-site-${version}";
            version = packageJSON.version;
            src = gitignoreSource ./.;
            packageJson = "${src}/package.json";
            yarnLock = "${src}/yarn.lock";
            buildPhase = ''
              yarn --offline build
            '';
            distPhase = "true";
          };

          default = pkgs.writeShellApplication {
            name = packageJSON.name;
            runtimeInputs = [site-src pkgs.nodejs pkgs.rage];
            text = ''
              node ${site-src}/libexec/${packageJSON.name}/deps/${packageJSON.name}/build
            '';
          };
          cfgat_archival_worker = let
            pymeta3 = pkgs.python3Packages.buildPythonPackage rec {
              pname = "PyMeta3";
              version = "0.5.1";
              src = pkgs.python3Packages.fetchPypi {
                inherit pname version;
                sha256 = "sha256-GL2jJtmpu/WHv8DuC8loZJZNeLBnKIvPVdTZhoHQW8s=";
              };
              propagatedBuildInputs = [pkgs.python3Packages.twisted];
              doCheck = false;
            };
            pybars = pkgs.python3Packages.buildPythonPackage rec{
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
              propagatedBuildInputs = [pymeta3];
            };
            mypython = pkgs.python3.withPackages (p: [pybars p.toml p.python-dateutil p.loguru]);
          in
            pkgs.writeShellApplication {
              name = "cfgat_archival_worker";
              runtimeInputs = [mypython];
              text = ''
                export TEMPLATE_PATH=${./static/mail_templates.toml}
                export TIMES_PATH=${./static/times.toml}
                ${mypython}/bin/python ${./python/archival_tool.py}
              '';
            };
        };

        devShell = pkgs.mkShell {
          buildInputs = [pkgs.yarn pkgs.nodejs pkgs.rage packages.cfgat_archival_worker];
          shellHook = ''
            export PATH=$PATH:$(pwd)/node_modules/.bin/
            export TEMPLATES_PATH=$(pwd)/static/mail_templates.toml
            export TIMES_PATH=$(pwd)/static/mail_templates.toml
          '';
        };
      }
    );
}
