{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  name = "nexios-ai-env";

  buildInputs = with pkgs; [
    # Node.js runtime
    nodejs_20
    nodePackages.npm

    # Python runtime
    python311
    python311Packages.pip

    # Go runtime
    go

    # Shell tools
    bash
    curl
    git
    jq
    which
  ];

  shellHook = ''
    echo "Nexios AI development environment ready"
    echo "Node.js: $(node --version)"
    echo "Python: $(python3 --version)"
    echo "Go: $(go version)"
  '';
}
