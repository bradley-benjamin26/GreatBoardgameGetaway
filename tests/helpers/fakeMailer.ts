import type { Mailer } from "../../src/types.js";

export class FakeMailer implements Mailer {
  sent: { to: string; subject: string; text: string }[] = [];
  async send(to: string, subject: string, text: string) {
    this.sent.push({ to, subject, text });
  }
}
