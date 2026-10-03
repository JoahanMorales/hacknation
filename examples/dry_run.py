#!/usr/bin/env python3
"""Dry run local real: IDEA -> backlog -> claim -> review -> merge -> handoff.

Ejecuta el smoke completo y la demo ficticia. Aprobación en claims; no usa un
PR real de GitHub ni acredita video, submission o todas las tareas P0.
"""
import argparse
import hashlib
import importlib.util
import json
import shlex
import shutil
import sys
import time
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--work-dir", type=Path, required=True)
    parser.add_argument("--report", type=Path, required=True)
    parser.add_argument("--merge-timeout", type=int, default=1800)
    args = parser.parse_args()
    package = Path(__file__).resolve().parents[1]
    spec = importlib.util.spec_from_file_location("hack_tests", package / "tests/test_hack.py")
    helper = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(helper)
    scratch = args.work_dir.resolve()
    helper.expect(scratch != package and package not in scratch.parents, "Use una ruta nueva fuera del paquete")
    scratch.mkdir(parents=True, exist_ok=False)
    runner = helper.Runner(package, scratch, helper.resolve_binary("bash"), helper.resolve_binary("git"))
    started = time.monotonic()
    f = runner.fixture("turno-claro", count=2)
    python_command = shlex.quote(sys.executable.replace("\\", "/"))
    for name in ("IDEA.md", "HACKATHON.md", "TASKS.md"):
        content = (package / "examples" / name).read_text(encoding="utf-8")
        if name == "TASKS.md":
            content = content.replace("**Cómo verificar:** python3 ", "**Cómo verificar:** " + python_command + " ")
        if name == "HACKATHON.md":
            config_keys = ("Backlog-Proposed-Epoch:", "Backlog-Approved:", "Autonomy:", "Auto-Merge:",
                           "Review-Mode:", "Freeze-Epoch:", "Events-Per-Session:", "Checkpoint-Percent:",
                           "Merge-Lease-Seconds:")
            content = "\n".join(line for line in content.splitlines() if not line.startswith(config_keys)) + "\n"
            content += ("\n# Configuración explícita de este ensayo local\n"
                        "Backlog-Proposed-Epoch: 999400\nBacklog-Approved: no\nAutonomy: yes\n"
                        "Auto-Merge: yes\nReview-Mode: claims\nFreeze-Epoch: 0\n"
                        "Events-Per-Session: 100\nCheckpoint-Percent: 60\nMerge-Lease-Seconds: 1800\n")
        (f.seed / name).write_bytes(content.encode("utf-8"))
    helper.expect((f.seed / "IDEA.md").read_bytes() == (package / "examples/IDEA.md").read_bytes(),
                  "IDEA del ensayo debe conservar los bytes originales")
    # El helper v2 omite hooks ocultos al construir su fixture; el ensayo completo los incluye.
    shutil.copytree(package / ".githooks", f.seed / ".githooks", dirs_exist_ok=True)
    (f.seed / "contracts").mkdir(exist_ok=True)
    contract = {"request": ["id", "wait_minutes", "urgency"],
                "recommendation": ["id", "explanation", "demo_data"]}
    (f.seed / "contracts/turn.json").write_text(json.dumps(contract) + "\n", encoding="utf-8")
    runner.g(f.seed, "add", ".")
    runner.g(f.seed, "commit", "-m", "Plan de IDEA, autonomía del ensayo y contrato/mock inicial")
    runner.g(f.seed, "push", "origin", "main")
    for worktree in f.worktrees:
        runner.g(worktree, "fetch", "origin", "main")
        runner.g(worktree, "merge", "--ff-only", "origin/main")
    tick = f.hack(0, "tick", now=1000000).stdout.strip()
    backlog_receipt = f.show("deadlines/backlog-proposed-1000000.md")
    helper.expect("Effect: ALLOW_P0" in backlog_receipt, "Tick debe acreditar el plazo de 600 s")
    claim = f.claim(0, "HACK-002", now=1000010,
                    next_step="Crear app/demo.py y validar turno B con datos ficticios").stdout.strip()
    reviewer_claim = f.claim(1, "HACK-003", now=1000010,
                             next_step="Revisar HACK-002; después implementar app/scoring.py").stdout.strip()
    decision = f.hack(0, "decision", "HACK-002", "--option", "Urgencia primero y espera como desempate",
                      "--why", "Opción reversible de IDEA que demuestra J1 sin proveedor",
                      "--reversible", "yes", "--authorized", "yes", "--class", "routine",
                      now=1000020).stdout.strip()
    decision_tick = f.hack(0, "tick", now=1000920).stdout.strip()
    helper.expect("REVERSIBLE_AND_LOG" in f.show("DECISIONS.md"), "Tick debe registrar la decisión tras 900 s")
    app = f.worktrees[0] / "app"
    app.mkdir(exist_ok=True)
    (app / "demo.py").write_text('''import json
import sys
requests = [{"id": "A", "wait_minutes": 40, "urgency": 1},
            {"id": "B", "wait_minutes": 10, "urgency": 3},
            {"id": "C", "wait_minutes": 20, "urgency": 2}]
winner = max(requests, key=lambda item: (item["urgency"], item["wait_minutes"]))
result = {"id": winner["id"], "explanation": "Urgencia primero; espera desempata", "demo_data": True}
if "--verify" in sys.argv:
    assert result["id"] == "B" and result["demo_data"] is True
print(json.dumps(result, ensure_ascii=False))
''', encoding="utf-8")
    validation = runner.run([sys.executable, "app/demo.py", "--verify"], cwd=f.worktrees[0]).stdout.strip()
    parsed = json.loads(validation)
    helper.expect(parsed["id"] == "B" and parsed["demo_data"], "La demo debe declarar datos ficticios")
    runner.g(f.worktrees[0], "add", "app/demo.py")
    runner.g(f.worktrees[0], "commit", "-m", "HACK-002 skeleton mock verificable de Turno Claro")
    runner.g(f.worktrees[0], "push", "origin", f.branches[0])
    task_tip = runner.g(f.worktrees[0], "rev-parse", "HEAD").stdout.strip()
    # El adaptador se ejecuta sobre la app real. Sus archivos quedan fuera del
    # commit de tarea y el planificador los publica en base: R32 no autofusiona smoke.
    product_command = python_command + " app/demo.py --verify"
    init = f.hack(0, "init-smoke", "--command", product_command, now=1000940).stdout.strip()
    for name in ("smoke-project", ".smoke-project.provenance"):
        shutil.copy2(f.worktrees[0] / "scripts" / name, f.seed / "scripts" / name)
    runner.g(f.seed, "add", "scripts/smoke-project", "scripts/.smoke-project.provenance")
    runner.g(f.seed, "commit", "-m", "Preparar adaptador validado del ensayo antes de integrar tarea")
    runner.g(f.seed, "push", "origin", "main")
    checkpoint_next = "Solicitar revisión independiente del SHA actual y ejecutar hack merge HACK-002"
    f.hack(0, "checkpoint", "HACK-002", "--done", "Skeleton B y demo_data=true; validación salida 0",
           "--decision", "Urgencia primero y espera como desempate", "--why", "Decisión reversible registrada por tick",
           "--fails", "ninguno en demo ficticia; video y submission pendientes",
           "--commands", product_command, "--next", checkpoint_next, now=1000950)
    review_queue = f.hack(0, "done", "HACK-002", "--pr", "https://example.invalid/pull/2",
                         "--evidence", "Demo ficticia --verify salida 0; B y demo_data=true",
                         now=1000960).stdout.strip()
    review_sandbox = scratch / "review-sandbox"
    runner.g(scratch, "clone", f.remote, review_sandbox)
    runner.g(review_sandbox, "fetch", "origin", f.branches[0])
    runner.g(review_sandbox, "checkout", "--detach", task_tip)
    independent = runner.run([sys.executable, "app/demo.py", "--verify"], cwd=review_sandbox).stdout.strip()
    helper.expect(json.loads(independent) == parsed, "El revisor debe ejecutar el SHA exacto en otro checkout")
    review = f.hack(1, "review", "HACK-002", "--sha", task_tip, "--verdict", "approve",
                    now=1000970).stdout.strip()
    review_record = f.show("reviews/HACK-002.md")
    helper.expect(task_tip in review_record and "Reviewer: agent-2" in review_record,
                  "La aprobación debe acreditar SHA y otro agente con claim activo")
    merge_env = {"HACK_AGENT": "agent-1", "HACK_HUMAN": "", "HACK_NOW": "1000980", "HACK_REMOTE": "origin"}
    merge = runner.run([runner.bash, "scripts/hack", "merge", "HACK-002"], cwd=f.worktrees[0],
                       env=merge_env, timeout=args.merge_timeout).stdout.strip()
    integrated = f.show("tasks/HACK-002.md")
    helper.expect("State: INTEGRATED" in integrated, "La cola debe fusionar realmente la tarea")
    merge_commit = runner.g(f.remote, "rev-parse", "main").stdout.strip()
    helper.expect(merge_commit in integrated, "El registro debe nombrar el commit real de integración")
    runner.g(f.remote, "merge-base", "--is-ancestor", task_tip, merge_commit)
    clean = scratch / "integrated-checkout"
    runner.g(scratch, "clone", f.remote, clean)
    integrated_validation = runner.run([sys.executable, "app/demo.py", "--verify"], cwd=clean).stdout.strip()
    helper.expect(json.loads(integrated_validation) == parsed, "La base integrada debe ejecutar la demo")
    product_gate = runner.run([runner.bash, "scripts/lib/smoke-init.sh", "gate"], cwd=clean).stdout.strip()
    helper.expect("PRODUCT_PASS" in product_gate, "El adaptador debe ejecutarse desde la base integrada")
    handoff = f.hack(0, "handoff", "HACK-002", now=1000990).stdout
    status = f.hack(0, "status", now=1000991).stdout
    summary = f.hack(0, "status", "--task", "HACK-002", "--summary", now=1000991).stdout
    lint = f.hack(0, "lint", "--secrets", now=1000991).stdout
    state = f.show("STATE.md")
    helper.expect("Integrada en main:" in handoff and "Sesiones" in handoff,
                  "Handoff integrado debe conservar integración y sesiones")
    for name, content in (("handoff.txt", handoff), ("status.txt", status), ("summary.txt", summary)):
        (scratch / name).write_text(content, encoding="utf-8")
    hash_names = ["AGENTS.md", "scripts/hack", "scripts/hack-coordination", "scripts/lib/review-merge.sh",
                  "scripts/secret-scan", "scripts/lib/security.sh", "scripts/lib/smoke-init.sh", "scripts/smoke",
                  "examples/dry_run.py", "examples/IDEA.md"]
    report = {"status": "PASS", "scope": "Ejemplo ficticio con Git local, revisión claims, merge real y smoke completo",
              "idea": "examples/IDEA.md", "backlog": "examples/TASKS.md",
              "package_sha256": {name: hashlib.sha256((package / name).read_bytes()).hexdigest() for name in hash_names},
              "idea_copied_unchanged": (f.seed / "IDEA.md").read_bytes() == (package / "examples/IDEA.md").read_bytes(),
              "p0_to_rubric": {"HACK-001": "J2", "HACK-002": "J1", "HACK-003": "J1", "HACK-004": "J3"},
              "simulated_clock": "HACK_NOW; 600 s backlog y 900 s decisión, sin esperas reales",
              "tick": tick, "backlog_receipt": backlog_receipt, "claim": claim, "reviewer_claim": reviewer_claim,
              "decision": decision, "decision_tick": decision_tick, "init_smoke": init,
              "validation": parsed, "validation_exit": 0, "independent_validation": json.loads(independent),
              "review_queue": review_queue, "review": review, "review_record": review_record,
              "reviewed_sha": task_tip, "merge": merge, "merge_commit": merge_commit,
              "integrated_task": integrated, "integrated_validation": json.loads(integrated_validation),
              "product_gate": product_gate, "handoff": handoff, "status_output": status,
              "summary": summary, "lint": lint, "task": "HACK-002", "branch": f.branches[0],
              "worktree": str(f.worktrees[0]), "remote": str(f.remote), "state_snapshot": state,
              "verification_command": product_command,
              "verification_runtime_adjustment": "Sólo el ejecutable python3 de TASKS del fixture se adapta a sys.executable",
              "core_lines": len((package / "AGENTS.md").read_text(encoding="utf-8").splitlines()),
              "core_words": len((package / "AGENTS.md").read_text(encoding="utf-8").split()),
              "state_lines": len(state.splitlines()), "state_words": len(state.split()),
              "seconds": round(time.monotonic() - started, 3),
              "not_verified": ["PR/API de GitHub real", "Todas las tareas P0 del ejemplo",
                               "video, ensayo humano y submission", "producto con datos reales o proveedor externo"]}
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("PASS dry_run: IDEA -> backlog tick -> claim -> demo ficticia -> review SHA -> merge real -> handoff")
    print("Budget: AGENTS %s líneas/%s palabras; STATE %s líneas/%s palabras" %
          (report["core_lines"], report["core_words"], report["state_lines"], report["state_words"]))
    print("Merged: " + merge_commit)
    return 0


if __name__ == "__main__":
    sys.exit(main())
