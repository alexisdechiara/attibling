// OPT-IN, for throw-away containers where root is the only user (GEEKLY_DEMO_ALLOW_ROOT=1, see install.sh):
// ghost-cli refuses to run as root, so this makes it believe it is not. Never needed on a personal computer.
// Only `ghost install` is run with it; Ghost itself is started with plain node.
process.getuid = () => 1000;
process.getgid = () => 0;
