{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell rec {
  buildInputs = with pkgs; [
    nodejs_20
    pnpm
    python3
    zsh
    pkg-config
    libuuid
    udev
    nss
    nspr
    atk
    at-spi2-atk
    cups
    libdrm
    gtk3
    pango
    cairo
    alsa-lib
    mesa
    expat
    libX11
    libxcb
    libXcomposite
    libXcursor
    libXdamage
    libXext
    libXfixes
    libXi
    libXrender
    libXtst
    libxshmfence
  ];

  shellHook = ''
    export LD_LIBRARY_PATH=${pkgs.lib.makeLibraryPath buildInputs}
    echo "Welcome to the Auditbooks development shell!"
    echo "Node version: $(node -v)"
    echo "pnpm version: $(pnpm -v)"
  '';
}
