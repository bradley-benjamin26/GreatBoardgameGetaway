import nodemailer from "nodemailer";
import type { Config } from "../config.js";
import type { Mailer } from "../types.js";

export function createMailer(config: Config): Mailer {
  const transport = nodemailer.createTransport(config.smtpUrl);
  return {
    async send(to, subject, text) {
      await transport.sendMail({ from: config.mailFrom, to, subject, text });
    },
  };
}
