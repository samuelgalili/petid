// GitHub Actions entry point. The deploy job and the site-health workflow
// call this with the Twilio settings in the environment. It does not read a
// file of secrets and it does not print them.
import { runOwnerNotifyCommand } from "./ownerNotify.js";

const code = await runOwnerNotifyCommand(process.argv[2], { env: process.env });
process.exit(code);
