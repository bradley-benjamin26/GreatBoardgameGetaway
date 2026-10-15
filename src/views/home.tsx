import { Layout, type Page } from "./layout.js";

export const Home = (p: Page) => (
  <Layout title="Home" {...p}>
    <h1>Welcome, {p.user?.username}</h1>
    <p>Add your games, say what you want to play, and set up tables for the weekend.</p>
  </Layout>
);

export const Message = (p: Page & { title: string; text: string }) => (
  <Layout title={p.title} user={p.user} csrf={p.csrf}>
    <h1>{p.title}</h1>
    <p>{p.text}</p>
  </Layout>
);
