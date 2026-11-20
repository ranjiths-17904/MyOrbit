import { useState } from 'react';
import { api } from '../api.js';
import { coachReply } from '../lib/coach.js';
import { todayISO } from '../lib/dates.js';
import { Page, useAction } from '../components/ui.jsx';
import { useStore } from '../store/Store.jsx';

const PROMPTS = [
  'Create a 30-day Java and SQL learning plan.',
  'I missed yesterday\'s tasks. Reorganize my schedule.',
  'I have only three hours today. Generate a suitable timetable.',
  'Evaluate my weekly progress and identify my weak areas.',
  'Prepare a schedule for a software developer fresher.'
];

export function AssistantPage() {
  const { vault, db, addTask } = useStore();
  const run = useAction();
  const [messages, setMessages] = useState([{ role: 'bot', text: 'Ask for a plan. I will use the skills, tasks, and logs already saved, and I will say when the on-device rules answered instead of an AI API.', source: 'rules' }]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const ask = async (message) => {
    const content = (message || text).trim();
    if (!content) return;
    setText('');
    setMessages((list) => [...list, { role: 'user', text: content }]);
    setBusy(true);
    let answer = coachReply(content, vault);
    if (db.useApi && db.token) {
      try {
        const remote = await api('/api/assistant', { method: 'POST', token: db.token, body: { message: content } });
        if (remote?.source === 'llm' && remote.reply) {
          answer = { ...answer, ...remote, suggestions: remote.suggestions?.length ? remote.suggestions : answer.suggestions || [] };
        }
      } catch {
        answer = { ...answer, reply: `${answer.reply}\n\nThe AI API did not answer. This reply is from the on-device planner.` };
      }
    }
    setMessages((list) => [...list, { role: 'bot', text: answer.reply, source: answer.source, suggestions: answer.suggestions || [] }]);
    setBusy(false);
  };

  return (
    <Page title="AI Assistant" subtitle="Suggestions stay as drafts until you add them. Completed work is never invented.">
      <article className="card chat">
        <div className="bubbles">
          {messages.map((message, index) => (
            <div key={`${message.role}-${index}`} className={`bubble ${message.role === 'user' ? 'user' : 'bot'}`}>
              {message.text}
              {message.source ? <div className="muted">Source: {message.source === 'llm' ? 'AI API' : 'on-device rules'}</div> : null}
              {message.suggestions?.length ? (
                <div className="suggest">
                  {message.suggestions.map((item) => (
                    <div key={item.title} className="item" style={{ marginTop: 6 }}>
                      <div><b>{item.title}</b><div className="muted">{item.detail}</div></div>
                      <button className="btn" type="button" onClick={() => run(() => addTask({
                        title: item.title,
                        description: item.detail,
                        category: item.category || 'Learning',
                        priority: item.priority || 'medium',
                        startDate: item.dueDate || todayISO(),
                        dueDate: item.dueDate || todayISO(),
                        estimateMin: item.estimateMin || 40,
                        skillId: item.skillId,
                        source: 'assistant'
                      }), 'Task added. It is still pending.')}>Add task</button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
        <div>
          <div className="filters">
            {PROMPTS.map((prompt) => <button key={prompt} className="chip" type="button" onClick={() => ask(prompt)}>{prompt}</button>)}
          </div>
          <form className="composer" onSubmit={(event) => { event.preventDefault(); ask(); }}>
            <input value={text} onChange={(event) => setText(event.target.value)} placeholder="Ask about your saved plan" aria-label="Message" disabled={busy} />
            <button className="btn" type="submit" disabled={busy}>{busy ? 'Thinking…' : 'Send'}</button>
          </form>
        </div>
      </article>
    </Page>
  );
}
