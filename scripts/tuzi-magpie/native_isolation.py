"""Small process/network checks shared by the isolated native acceptance runner."""
from contextlib import ExitStack
import socket
import subprocess


def require_free_ports(ports):
    """Refuse a stale fixture/gateway before starting any acceptance process."""
    with ExitStack() as held:
        for port in ports:
            probe = held.enter_context(socket.socket())
            try:
                probe.bind(('127.0.0.1', port))
            except OSError as error:
                raise RuntimeError(f'Acceptance port {port} is already occupied') from error


def require_listener(pid, port):
    """Return lsof evidence only when this exact PID owns the TCP listener."""
    result = subprocess.run(
        ['/usr/sbin/lsof', '-nP', '-a', '-p', str(pid),
         f'-iTCP:{port}', '-sTCP:LISTEN', '-F', 'p'],
        capture_output=True, text=True)
    owners = [line[1:] for line in result.stdout.splitlines() if line.startswith('p')]
    if result.returncode != 0 or owners != [str(pid)]:
        raise RuntimeError(f'The launched app PID {pid} does not own gateway port {port}')
    return result.stdout


def sandboxed(profile, executable, *arguments):
    """Use the same OS isolation for the app and its synthetic service."""
    return ['/usr/bin/sandbox-exec', '-f', str(profile), str(executable), *arguments]
