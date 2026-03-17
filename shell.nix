{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = with pkgs; [
    nodejs_20
    yarn
    python3
    pkg-config
    libuuid
    udev
  ];

  shellHook = ''
    echo "Welcome to the Auditbooks development shell!"
    echo "Node version: $(node -v)"
    echo "Yarn version: $(yarn -v)"
  '';
}
