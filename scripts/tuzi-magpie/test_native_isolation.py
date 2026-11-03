"""Low-cost checks; no app, external service, keychain or real config is used."""
import contextlib
import io
import json
from pathlib import Path
import runpy
import socket
import tempfile
from types import SimpleNamespace
import subprocess
import unittest
from unittest.mock import patch

from native_isolation import require_free_ports, require_listener


class NativeIsolationTests(unittest.TestCase):
    def test_busy_fixture_or_gateway_is_refused(self):
        with socket.socket() as owner:
            owner.bind(('127.0.0.1', 0))
            busy = owner.getsockname()[1]
            for ports in ((busy, 0), (0, busy)):
                with self.assertRaisesRegex(RuntimeError, 'already occupied'):
                    require_free_ports(ports)

    def test_free_ports_are_released(self):
        require_free_ports((0, 0))

    def test_another_or_missing_listener_never_passes(self):
        for status, output in ((1, ''), (0, 'p99\n'), (0, 'p42\np99\n'), (0, '')):
            with patch('native_isolation.subprocess.run', return_value=subprocess.CompletedProcess([], status, output, '')):
                with self.assertRaisesRegex(RuntimeError, 'does not own'):
                    require_listener(42, 18343)

    def test_exact_pid_and_port_are_required(self):
        with patch('native_isolation.subprocess.run', return_value=subprocess.CompletedProcess([], 0, 'p42\nf12\n', '')) as run:
            self.assertEqual(require_listener(42, 18343), 'p42\nf12\n')
            self.assertEqual(run.call_args.args[0], ['/usr/sbin/lsof', '-nP', '-a', '-p', '42', '-iTCP:18343', '-sTCP:LISTEN', '-F', 'p'])

    def test_runner_rejects_busy_ports_before_processes_or_output(self):
        with tempfile.TemporaryDirectory(prefix='tuzi-native-runner-test-') as root:
            out = Path(root).resolve()/'run'
            argv = ['native-acceptance.py', '--app', str(Path(root)/'app'), '--fixture', str(Path(root)/'fixture'), '--output', str(out)]
            with patch('sys.argv', argv), patch('native_isolation.require_free_ports', side_effect=RuntimeError('occupied')), patch('subprocess.Popen') as launch:
                with self.assertRaisesRegex(RuntimeError, 'occupied'):
                    runpy.run_path(str(Path(__file__).with_name('native-acceptance.py')), run_name='__main__')
            launch.assert_not_called()
            self.assertFalse(out.exists())

    def test_runner_cannot_turn_ui_success_into_success_on_another_gateway(self):
        with tempfile.TemporaryDirectory(prefix='tuzi-native-runner-test-') as root:
            out = Path(root).resolve()/'run'
            app, fixture = Path(root).resolve()/'app', Path(root).resolve()/'fixture'
            argv = ['native-acceptance.py', '--app', str(app), '--fixture', str(fixture), '--output', str(out)]
            launched = []
            def launch(command, **kwargs):
                launched.append(command)
                if len(launched) == 2:
                    Path(kwargs['env']['TUZI_MAGPIE_FIXTURE_REPORT']).write_text(json.dumps({'passed': True, 'providerId': 'synthetic', 'checks': [], 'errors': []}))
                return SimpleNamespace(pid=40+len(launched), poll=lambda: None, wait=lambda **kwargs: 0)
            with patch('sys.argv', argv), patch('native_isolation.require_free_ports'), patch('native_isolation.require_listener', side_effect=RuntimeError('wrong owner')) as listener, patch('subprocess.Popen', side_effect=launch), patch('os.killpg'), patch('time.sleep'), patch('urllib.request.build_opener') as opener, contextlib.redirect_stdout(io.StringIO()):
                opener.return_value.open.side_effect = [io.BytesIO(b'{"output":"TUZI_CLI_OK"}'), io.BytesIO(b'{"modelCalls":1}')]
                with self.assertRaises(SystemExit) as stopped:
                    runpy.run_path(str(Path(__file__).with_name('native-acceptance.py')), run_name='__main__')
            self.assertEqual(stopped.exception.code, 1)
            listener.assert_called_once_with(42, 18343)
            opener.assert_not_called()
            result = json.loads((out/'result.json').read_text())
            self.assertIs(result['passed'], False)
            self.assertIs(result['gatewayVerified'], False)
            self.assertEqual(result['errors'][-1]['stage'], 'gateway')
            self.assertEqual(len(launched), 2)
            for command, executable in zip(launched, (fixture, app)):
                self.assertEqual(command[:4], ['/usr/bin/sandbox-exec', '-f', str(out/'sandbox.sb'), str(executable)])



if __name__ == '__main__':
    unittest.main()
