{
  description = "Simple book-keeping app for everyone";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs {
          inherit system;
        };

        libraries = with pkgs; [
          webkitgtk_4_1
          gtk3
          cairo
          gdk-pixbuf
          glib
          dbus
          openssl
          librsvg
          libsoup_3
          wayland
          libxkbcommon
        ];

        packages = with pkgs; [
          curl
          wget
          pkg-config
          dbus
          openssl
          glib
          gtk3
          webkitgtk_4_1
          librsvg
          libsoup_3
          nodejs_22
          pnpm_9
          clang
          llvm
          rustc
          cargo
          wayland
          libxkbcommon
          direnv
          mold
        ];
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = packages;

          shellHook = ''
            export LD_LIBRARY_PATH=/usr/lib/wsl/lib:$LD_LIBRARY_PATH:${pkgs.lib.makeLibraryPath libraries}:${pkgs.mesa}/lib
            export LIBGL_DRIVERS_PATH=${pkgs.mesa}/lib/dri
            export GDK_BACKEND=wayland,x11
            export CLUTTER_BACKEND=wayland
            export RUSTFLAGS="-C link-arg=-fuse-ld=mold"

            # WSL2 GUI Rendering fixes for WebKitGTK/Tauri
            export WEBKIT_DISABLE_COMPOSITING_MODE=1
            export WEBKIT_DISABLE_DMABUF_RENDERER=1
            export LIBGL_ALWAYS_SOFTWARE=1
          '';
        };
      }
    );
}
