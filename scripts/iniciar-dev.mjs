import { execSync, spawn } from "node:child_process";

const [, , puertoArg, ...comando] = process.argv;

if (!puertoArg || comando.length === 0) {
  console.error("Uso: node scripts/iniciar-dev.mjs <puerto> <comando> [args...]");
  process.exit(1);
}

const puerto = Number(puertoArg);

if (!Number.isInteger(puerto) || puerto <= 0) {
  console.error(`Puerto invalido: ${puertoArg}`);
  process.exit(1);
}

function obtenerPidsEnPuerto(puertoObjetivo) {
  try {
    const salida = execSync(`ss -ltnpH 'sport = :${puertoObjetivo}'`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      shell: true,
    });

    const pids = new Set();
    for (const coincidencia of salida.matchAll(/pid=(\d+)/g)) {
      pids.add(Number(coincidencia[1]));
    }

    return [...pids];
  } catch {
    return [];
  }
}

async function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function liberarPuerto(puertoObjetivo) {
  const pids = obtenerPidsEnPuerto(puertoObjetivo);

  if (pids.length === 0) {
    return;
  }

  console.log(`Liberando puerto ${puertoObjetivo}: ${pids.join(", ")}`);

  for (const pid of pids) {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      // Ignorar procesos ya cerrados o inaccesibles.
    }
  }

  for (let intento = 0; intento < 20; intento += 1) {
    if (obtenerPidsEnPuerto(puertoObjetivo).length === 0) {
      return;
    }
    await esperar(250);
  }

  for (const pid of obtenerPidsEnPuerto(puertoObjetivo)) {
    try {
      process.kill(pid, "SIGKILL");
    } catch {
      // Ignorar procesos ya cerrados o inaccesibles.
    }
  }
}

await liberarPuerto(puerto);

const hijo = spawn(comando[0], comando.slice(1), {
  stdio: "inherit",
  shell: true,
});

hijo.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
