// Copyright 2026 Wultra s.r.o. Licensed under the Apache License, Version 2.0.
import Config from 'react-native-config';
import { TestExecutor } from './TestExecutor';
import { ManualTesting } from './ManualTesting';
import { button, element } from './dom';

const root = document.getElementById('app')!;
let handleBack = () => {};

document.addEventListener('deviceready', () => {
  document.addEventListener('backbutton', (event) => {
    event.preventDefault();
    handleBack();
  });
  if (Config.TESTAPP_MODE !== 'manual' && Config.TEST_COLLECTOR_URL) {
    showAutomatic();
  } else {
    showHome();
  }
}, false);

function showHome() {
  handleBack = () => {};
  root.replaceChildren(
    element('h1', 'PowerAuth Example'),
    button('PowerAuth Testing', () => showManual(false)),
    button('Simple Configuration', () => showManual(true)),
    button('Automatic & Interactive Tests', showAutomatic),
  );
}

function showManual(simple: boolean) {
  const manual = new ManualTesting(root, showHome, simple);
  handleBack = () => manual.back();
}

function showAutomatic() {
  let running = true;
  const back = button('Back', () => { if (!running) { showHome(); } }, true);
  const regular = button('Run regular', () => { executor.runTests(false); }, true);
  const interactive = button('Run interactive', () => { executor.runTests(true); }, true);
  const cancel = button('Cancel', () => executor.cancelTests());
  const status = element('p');
  const progress = element('pre');
  const message = element('pre');
  status.id = 'tests-status';
  progress.id = 'tests-progress';
  message.id = 'test-message';
  message.setAttribute('role', 'status');
  regular.id = 'tests-simple';
  interactive.id = 'tests-full';
  cancel.id = 'tests-stop';
  handleBack = () => { if (!running) { showHome(); } };
  root.replaceChildren(back, element('h1', 'Automatic & Interactive Tests'), regular, interactive, cancel, status, progress, message);
  const executor = new TestExecutor(async (_context, text, duration) => {
    message.textContent = text;
    await new Promise<void>((resolve) => setTimeout(resolve, duration));
    message.textContent = '';
  }, (result) => {
    progress.textContent = `${result.succeeded} succeeded\n${result.failed} failed\n${result.skipped} skipped\n${result.total} total`;
  }, (inProgress) => {
    running = inProgress;
    back.disabled = regular.disabled = interactive.disabled = running;
    cancel.disabled = !running;
    status.textContent = running ? 'Tests running' : 'Tests finished';
    message.textContent = '';
  });
}
