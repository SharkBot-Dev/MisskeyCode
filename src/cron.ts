import corn from "node-cron";
import { loginSession } from "./cache/session.js";

export function setCron() {
    corn.schedule('0 0 * * *', () => {
        loginSession.clear();
    });
}