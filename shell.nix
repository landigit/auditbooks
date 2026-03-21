{ pkgs ? import (fetchTarball "https://github.com/NixOS/nixpkgs/archive/nixos-24.11.tar.gz") {} }:

pkgs.mkShell {
  nativeBuildInputs = with pkgs; [
    nodejs_22
    yarn
    pnpm
    nodePackages.node-gyp
    python3
    pkg-config
    stdenv.cc.cc
    gnumake
  ];

  buildInputs = with pkgs; [
    libuuid
    at-spi2-atk
    at-spi2-core
    atk
    alsa-lib
    cairo
    cups
    dbus
    expat
    fontconfig
    freetype
    gdk-pixbuf
    glib
    gtk3
    libGL
    xorg.libX11
    xorg.libXcomposite
    xorg.libXcursor
    xorg.libXdamage
    xorg.libXext
    xorg.libXfixes
    xorg.libXi
    xorg.libXrandr
    xorg.libXrender
    xorg.libXtst
    libdrm
    libnotify
    xorg.libxcb
    xorg.libxshmfence
    libxkbcommon
    mesa
    nspr
    nss
    pango
    systemd
  ];

  shellHook = ''
    # Some native modules (like better-sqlite3) expect 'python' to be in the path
    mkdir -p .nix-shell-bin
    ln -sf ${pkgs.python3}/bin/python3 .nix-shell-bin/python
    export PATH=$PWD/.nix-shell-bin:$PATH

    # Ensure ld and build tools are available
    export LD_LIBRARY_PATH=${pkgs.lib.makeLibraryPath (with pkgs; [
      stdenv.cc.cc
      libGL
      expat
      fontconfig
      nss
      nspr
      dbus
      atk
      at-spi2-atk
      at-spi2-core
      cups
      libdrm
      pango
      cairo
      gdk-pixbuf
      gtk3
      mesa
      alsa-lib
      xorg.libxshmfence
      xorg.libX11
      xorg.libXcomposite
      xorg.libXcursor
      xorg.libXdamage
      xorg.libXext
      xorg.libXfixes
      xorg.libXi
      xorg.libXrandr
      xorg.libXrender
      xorg.libXtst
      xorg.libxcb
      libxkbcommon
    ])}
    
    echo "Auditbooks development environment loaded (NixOS 24.11 Pinned)."
    echo "Using Node $(node -v) and $(yarn -v)"
  '';
}
