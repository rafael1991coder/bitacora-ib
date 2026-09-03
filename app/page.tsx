'use client';
/* oxlint-disable react/react-compiler, react-hooks/exhaustive-deps, jsx-a11y/label-has-associated-control, jsx-a11y/no-autofocus, jsx-a11y/no-static-element-interactions, jsx-a11y/prefer-tag-over-role */

import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Check, ExternalLink, FileText, Image as ImageIcon, KeyRound, LogOut, Plus, Search, ShieldCheck, Trash2, UserRound, Video, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';

type ResourceType = 'video' | 'documento' | 'imagen';
type User = { id: string; name: string; password: string; pin: string; createdAt: string };
type Resource = { id: string; title: string; url: string; type: ResourceType; ownerId: string; studiedBy: string[]; createdAt: string };
type AppData = { users: User[]; resources: Resource[] };

const STORAGE_KEY = 'bitacora-ib-v1';
const SESSION_KEY = 'bitacora-ib-session';
const emptyData: AppData = { users: [], resources: [] };
const typeInfo = {
  video: { label: 'Video', icon: Video, color: 'text-rose-700 bg-rose-50' },
  documento: { label: 'Documento', icon: FileText, color: 'text-blue-700 bg-blue-50' },
  imagen: { label: 'Imagen', icon: ImageIcon, color: 'text-amber-700 bg-amber-50' },
} as const;

function makeId() { return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`; }
function makePassword() { const words = ['Atlas', 'Faro', 'Nexo', 'Saber', 'Brio', 'Lumen']; return `${words[Math.floor(Math.random() * words.length)]}-${Math.floor(1000 + Math.random() * 9000)}`; }
function makePin() { return String(Math.floor(100000 + Math.random() * 900000)); }

export default function Home() {
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<AppData>(emptyData);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showAccess, setShowAccess] = useState(true);
  const [showNewUser, setShowNewUser] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [showAddResource, setShowAddResource] = useState(false);
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'todos' | ResourceType>('todos');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const parsed: AppData = saved ? JSON.parse(saved) : emptyData;
      const session = sessionStorage.getItem(SESSION_KEY);
      setData(parsed);
      if (session && parsed.users.some((user) => user.id === session)) { setCurrentUserId(session); setShowAccess(false); }
    } catch { setNotice('No fue posible leer los datos guardados en este navegador.'); }
    finally { setReady(true); }
  }, []);

  useEffect(() => { if (ready) localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }, [data, ready]);

  const currentUser = data.users.find((user) => user.id === currentUserId);
  const filteredResources = useMemo(() => {
    const term = query.trim().toLowerCase();
    return data.resources.filter((resource) => {
      const owner = data.users.find((user) => user.id === resource.ownerId);
      return (filter === 'todos' || resource.type === filter) && (!term || resource.title.toLowerCase().includes(term) || resource.url.toLowerCase().includes(term) || owner?.name.toLowerCase().includes(term));
    });
  }, [data, filter, query]);

  function flash(message: string) { setNotice(message); window.setTimeout(() => setNotice(''), 3200); }
  function login(userId: string, password: string) { const user = data.users.find((item) => item.id === userId); if (!user || user.password !== password) return false; setCurrentUserId(user.id); sessionStorage.setItem(SESSION_KEY, user.id); setShowAccess(false); flash(`Bienvenido, ${user.name}.`); return true; }
  function createUser(name: string, password: string, pin: string) {
    const normalized = name.trim();
    if (!normalized) throw new Error('Escribe el nombre completo.');
    if (data.users.some((user) => user.name.toLowerCase() === normalized.toLowerCase())) throw new Error('Ese nombre ya está registrado. Selecciónalo para ingresar.');
    const user: User = { id: makeId(), name: normalized, password, pin, createdAt: new Date().toISOString() };
    setData((previous) => ({ ...previous, users: [...previous.users, user] })); setCurrentUserId(user.id); sessionStorage.setItem(SESSION_KEY, user.id); setShowNewUser(false); setShowAccess(false); flash('Usuario creado. Guarda tu contraseña y tu PIN.');
  }
  function addResource(title: string, url: string, type: ResourceType) {
    if (!currentUserId) throw new Error('Debes ingresar primero.');
    const normalizedUrl = url.match(/^https?:\/\//i) ? url : `https://${url}`;
    try { new URL(normalizedUrl); } catch { throw new Error('Escribe un vínculo válido.'); }
    const resource: Resource = { id: makeId(), title: title.trim(), url: normalizedUrl, type, ownerId: currentUserId, studiedBy: [], createdAt: new Date().toISOString() };
    setData((previous) => ({ ...previous, resources: [resource, ...previous.resources] })); setShowAddResource(false); flash('Recurso registrado en la biblioteca.');
  }
  function toggleStudied(resourceId: string) {
    if (!currentUserId) return;
    setData((previous) => ({ ...previous, resources: previous.resources.map((resource) => resource.id !== resourceId ? resource : { ...resource, studiedBy: resource.studiedBy.includes(currentUserId) ? resource.studiedBy.filter((id) => id !== currentUserId) : [...resource.studiedBy, currentUserId] }) }));
  }
  function deleteResource(resourceId: string) { const resource = data.resources.find((item) => item.id === resourceId); if (!resource || resource.ownerId !== currentUserId || !window.confirm('¿Eliminar este recurso de la biblioteca?')) return; setData((previous) => ({ ...previous, resources: previous.resources.filter((item) => item.id !== resourceId) })); flash('Recurso eliminado.'); }
  function logout() { setCurrentUserId(null); sessionStorage.removeItem(SESSION_KEY); setShowAccess(true); }

  useEffect(() => {
    const context = (document as Document & { modelContext?: { registerTool?: (tool: unknown, options?: unknown) => void } }).modelContext;
    if (!context?.registerTool || !currentUserId) return;
    const lifecycle = new AbortController();
    try { context.registerTool({ name: 'registrar_recurso_ib', title: 'Registrar recurso IB', description: 'Añade un enlace de video, documento o imagen a la biblioteca IB del usuario activo.', inputSchema: { type: 'object', properties: { title: { type: 'string' }, url: { type: 'string' }, type: { type: 'string', enum: ['video', 'documento', 'imagen'] } }, required: ['title', 'url', 'type'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: true }, execute(input: { title: string; url: string; type: ResourceType }) { addResource(input.title, input.url, input.type); return { status: 'registrado', title: input.title }; } }, { signal: lifecycle.signal }); } catch { /* Mejora progresiva. */ }
    return () => lifecycle.abort();
  }, [currentUserId]);

  if (!ready) return <div className="min-h-screen bg-[#f3f7f6]" />;
  const completed = currentUserId ? data.resources.filter((resource) => resource.studiedBy.includes(currentUserId)).length : 0;

  return <main className="min-h-screen bg-[#f3f7f6] text-[#122b2a]">
    <header className="sticky top-0 z-20 border-b border-[#d9e5e2] bg-[#f8fbfa]/90 backdrop-blur-xl"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 lg:px-8"><div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-[#0e615d] text-white shadow-sm"><BookOpen className="size-5" /></div><div><p className="font-serif text-xl font-bold leading-none tracking-tight">Bitácora IB</p><p className="mt-1 text-xs font-medium uppercase tracking-[0.16em] text-[#5d7774]">Biblioteca colaborativa</p></div></div>{currentUser && <div className="flex items-center gap-2"><button onClick={() => setShowAccess(true)} className="hidden items-center gap-2 rounded-full border border-[#cbdcda] bg-white px-3 py-2 text-sm font-semibold sm:flex"><span className="grid size-7 place-items-center rounded-full bg-[#d8eee9] text-[#0e615d]">{currentUser.name.charAt(0).toUpperCase()}</span>{currentUser.name}</button><Button onClick={logout} variant="ghost" size="icon-lg" aria-label="Cerrar sesión"><LogOut /></Button></div>}</div></header>
    <section className="mx-auto max-w-7xl px-5 py-8 lg:px-8 lg:py-10">
      <div className="mb-8 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end"><div><p className="mb-2 text-sm font-bold uppercase tracking-[0.18em] text-[#d45d3f]">Repositorio de aprendizaje</p><h1 className="max-w-3xl font-serif text-4xl font-bold leading-[1.05] tracking-tight text-[#153d3a] sm:text-5xl">Lo que aprendemos,<br className="hidden sm:block" /> queda compartido.</h1></div><Button onClick={() => currentUser ? setShowAddResource(true) : setShowAccess(true)} className="h-12 rounded-xl bg-[#d45d3f] px-5 text-base font-bold text-white shadow-[0_10px_25px_rgba(212,93,63,.22)] hover:bg-[#bb4d32]"><Plus className="size-5" /> Registrar recurso</Button></div>
      <div className="mb-7 grid gap-3 sm:grid-cols-3"><Stat value={data.resources.length} label="recursos compartidos" /><Stat value={completed} label="estudiados por ti" accent /><Stat value={data.users.length} label="personas registradas" /></div>
      <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-[#d9e5e2] bg-white p-3 shadow-[0_8px_30px_rgba(31,78,74,.05)] sm:flex-row sm:items-center"><label className="flex flex-1 items-center gap-2 rounded-xl bg-[#f2f7f6] px-3"><Search className="size-4 text-[#6f8986]" /><Input aria-label="Buscar recursos" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por título, vínculo o persona…" className="h-11 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0" /></label><NativeSelect aria-label="Filtrar por tipo" value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)} className="w-full sm:w-44"><NativeSelectOption value="todos">Todos los tipos</NativeSelectOption><NativeSelectOption value="video">Videos</NativeSelectOption><NativeSelectOption value="documento">Documentos</NativeSelectOption><NativeSelectOption value="imagen">Imágenes</NativeSelectOption></NativeSelect></div>
      {filteredResources.length === 0 ? <div className="rounded-3xl border border-dashed border-[#b9cfcc] bg-white/60 px-6 py-16 text-center"><div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-[#dceeea] text-[#0e615d]"><BookOpen /></div><h2 className="font-serif text-2xl font-bold">La biblioteca está lista</h2><p className="mx-auto mt-2 max-w-md text-[#5d7774]">Registra el primer video, documento o imagen que estés estudiando del IB.</p></div> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filteredResources.map((resource) => { const info = typeInfo[resource.type]; const Icon = info.icon; const owner = data.users.find((user) => user.id === resource.ownerId); const studied = !!currentUserId && resource.studiedBy.includes(currentUserId); const studiedNames = resource.studiedBy.map((id) => data.users.find((user) => user.id === id)?.name).filter(Boolean); return <article key={resource.id} className="group flex min-h-64 flex-col rounded-2xl border border-[#d9e5e2] bg-white p-5 shadow-[0_8px_28px_rgba(31,78,74,.05)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(31,78,74,.10)]"><div className="mb-5 flex items-start justify-between gap-3"><span className={`inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-bold uppercase tracking-wider ${info.color}`}><Icon className="size-4" />{info.label}</span>{resource.ownerId === currentUserId && <Button onClick={() => deleteResource(resource.id)} variant="ghost" size="icon-sm" aria-label="Eliminar recurso" className="text-[#78908e] hover:text-red-700"><Trash2 /></Button>}</div><h2 className="font-serif text-xl font-bold leading-snug text-[#173f3c]">{resource.title}</h2><p className="mt-2 line-clamp-1 text-sm text-[#6b817f]">Compartido por {owner?.name ?? 'Usuario'}</p><div className="mt-auto pt-6"><a href={resource.url} target="_blank" rel="noreferrer" className="mb-4 flex items-center justify-between rounded-xl bg-[#f2f7f6] px-3 py-3 text-sm font-bold text-[#0e615d] transition hover:bg-[#e4f1ee]">Abrir recurso <ExternalLink className="size-4" /></a><label className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 transition ${studied ? 'border-[#8cc5ba] bg-[#e7f5f1]' : 'border-[#dce7e5] bg-white hover:bg-[#f8fbfa]'}`}><Checkbox checked={studied} onCheckedChange={() => toggleStudied(resource.id)} disabled={!currentUserId} className="size-5" /><span className="flex-1 text-sm font-bold">{studied ? 'Lo estudié' : 'Marcar como estudiado'}</span>{studied && <Check className="size-4 text-[#0e615d]" />}</label>{studiedNames.length > 0 && <p className="mt-3 text-xs leading-relaxed text-[#6b817f]"><strong className="text-[#365956]">Estudiado por:</strong> {studiedNames.join(', ')}</p>}</div></article>; })}</div>}
    </section>
    {notice && <output className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-[#153d3a] px-4 py-3 text-sm font-semibold text-white shadow-xl">{notice}</output>}
    {showAccess && <AccessModal users={data.users} currentUserId={currentUserId} onClose={() => currentUser ? setShowAccess(false) : undefined} onLogin={login} onNew={() => { setShowAccess(false); setShowNewUser(true); }} onRecovery={() => { setShowAccess(false); setShowRecovery(true); }} />}
    {showNewUser && <NewUserModal onClose={() => { setShowNewUser(false); setShowAccess(true); }} onCreate={createUser} />}
    {showRecovery && <RecoveryModal users={data.users} onClose={() => { setShowRecovery(false); setShowAccess(true); }} />}
    {showAddResource && <ResourceModal onClose={() => setShowAddResource(false)} onAdd={addResource} />}
  </main>;
}

function Stat({ value, label, accent = false }: { value: number; label: string; accent?: boolean }) { return <div className={`rounded-2xl border p-5 ${accent ? 'border-[#9fcfc6] bg-[#dff1ed]' : 'border-[#d9e5e2] bg-white'}`}><p className="font-serif text-3xl font-bold text-[#153d3a]">{String(value).padStart(2, '0')}</p><p className="mt-1 text-sm font-medium text-[#5d7774]">{label}</p></div>; }
function ModalShell({ children, onClose, required = false }: { children: React.ReactNode; onClose: () => void; required?: boolean }) { return <div className="fixed inset-0 z-40 grid place-items-center overflow-y-auto bg-[#0c2c2a]/55 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (!required && event.target === event.currentTarget) onClose(); }}><section role="dialog" aria-modal="true" className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl sm:p-7">{!required && <button onClick={onClose} className="absolute right-5 top-5 grid size-9 place-items-center rounded-full text-[#67807d] hover:bg-[#eef5f3]" aria-label="Cerrar"><X className="size-5" /></button>}{children}</section></div>; }
function ModalHeading({ icon: Icon, title, text }: { icon: typeof UserRound; title: string; text: string }) { return <div className="mb-6"><div className="mb-4 grid size-11 place-items-center rounded-xl bg-[#dff1ed] text-[#0e615d]"><Icon className="size-5" /></div><h2 className="font-serif text-3xl font-bold tracking-tight text-[#153d3a]">{title}</h2><p className="mt-2 leading-relaxed text-[#617a77]">{text}</p></div>; }

function AccessModal({ users, currentUserId, onClose, onLogin, onNew, onRecovery }: { users: User[]; currentUserId: string | null; onClose: () => void; onLogin: (id: string, password: string) => boolean; onNew: () => void; onRecovery: () => void }) {
  const [userId, setUserId] = useState(currentUserId ?? users[0]?.id ?? ''); const [password, setPassword] = useState(''); const [error, setError] = useState('');
  function submit(event: { preventDefault(): void }) { event.preventDefault(); if (!userId) return setError('Selecciona un usuario.'); if (!onLogin(userId, password)) setError('La contraseña no coincide.'); }
  return <ModalShell onClose={onClose} required={!currentUserId}><ModalHeading icon={UserRound} title="¿Quién está estudiando?" text="Selecciona tu nombre para mantener tu progreso separado del de los demás." />{users.length > 0 ? <form onSubmit={submit} className="space-y-4"><label className="block text-sm font-bold">Nombre completo<NativeSelect value={userId} onChange={(event) => setUserId(event.target.value)} className="mt-2 w-full"><NativeSelectOption value="" disabled>Selecciona tu nombre</NativeSelectOption>{users.map((user) => <NativeSelectOption key={user.id} value={user.id}>{user.name}</NativeSelectOption>)}</NativeSelect></label><label className="block text-sm font-bold">Contraseña<Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoFocus className="mt-2 h-11" placeholder="Tu contraseña" /></label>{error && <p className="text-sm font-semibold text-red-700">{error}</p>}<Button type="submit" className="h-11 w-full bg-[#0e615d] text-base font-bold hover:bg-[#0a4b48]">Ingresar</Button></form> : <div className="rounded-xl bg-[#f2f7f6] p-4 text-sm text-[#526c69]">Todavía no hay usuarios. Crea el primero para comenzar.</div>}<div className="mt-5 grid gap-2 sm:grid-cols-2"><Button variant="outline" onClick={onNew} className="h-10"><Plus />Añadir persona</Button>{users.length > 0 && <Button variant="ghost" onClick={onRecovery} className="h-10"><KeyRound />Recuperar clave</Button>}</div><p className="mt-5 border-t border-[#e1ebe9] pt-4 text-xs leading-relaxed text-[#718784]">Esta versión guarda usuarios y recursos únicamente en este navegador.</p></ModalShell>;
}

function NewUserModal({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string, password: string, pin: string) => void }) {
  const [name, setName] = useState(''); const [password, setPassword] = useState(makePassword); const [pin] = useState(makePin); const [error, setError] = useState('');
  function submit(event: { preventDefault(): void }) { event.preventDefault(); try { if (password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres.'); onCreate(name, password, pin); } catch (reason) { setError(reason instanceof Error ? reason.message : 'No fue posible crear el usuario.'); } }
  return <ModalShell onClose={onClose}><ModalHeading icon={ShieldCheck} title="Crear usuario" text="Generamos una contraseña y un PIN de recuperación. Anótalos antes de continuar." /><form onSubmit={submit} className="space-y-4"><label className="block text-sm font-bold">Nombre completo<Input value={name} onChange={(event) => setName(event.target.value)} autoFocus className="mt-2 h-11" placeholder="Nombre y apellido" /></label><label className="block text-sm font-bold">Contraseña generada<div className="mt-2 flex gap-2"><Input value={password} onChange={(event) => setPassword(event.target.value)} className="h-11 font-mono" /><Button type="button" variant="outline" onClick={() => setPassword(makePassword())} className="h-11">Otra</Button></div></label><div className="rounded-xl border border-[#efc9a6] bg-[#fff5e9] p-4"><p className="text-xs font-bold uppercase tracking-wider text-[#9d5d24]">PIN de recuperación</p><p className="mt-1 font-mono text-3xl font-bold tracking-[0.25em] text-[#6e3e19]">{pin}</p><p className="mt-2 text-xs text-[#80532f]">Este PIN permite mostrar la contraseña guardada.</p></div>{error && <p className="text-sm font-semibold text-red-700">{error}</p>}<Button type="submit" className="h-11 w-full bg-[#0e615d] text-base font-bold hover:bg-[#0a4b48]">Guardar e ingresar</Button></form></ModalShell>;
}

function RecoveryModal({ users, onClose }: { users: User[]; onClose: () => void }) {
  const [userId, setUserId] = useState(users[0]?.id ?? ''); const [pin, setPin] = useState(''); const [result, setResult] = useState(''); const [error, setError] = useState('');
  function submit(event: { preventDefault(): void }) { event.preventDefault(); const user = users.find((item) => item.id === userId); if (user?.pin === pin) { setResult(user.password); setError(''); } else { setResult(''); setError('El PIN no coincide.'); } }
  return <ModalShell onClose={onClose}><ModalHeading icon={KeyRound} title="Recuperar contraseña" text="Selecciona el usuario y escribe su PIN personal de seis dígitos." /><form onSubmit={submit} className="space-y-4"><NativeSelect value={userId} onChange={(event) => setUserId(event.target.value)} className="w-full">{users.map((user) => <NativeSelectOption key={user.id} value={user.id}>{user.name}</NativeSelectOption>)}</NativeSelect><Input inputMode="numeric" maxLength={6} pattern="[0-9]{6}" value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, ''))} className="h-12 text-center font-mono text-xl tracking-[0.35em]" placeholder="000000" />{error && <p className="text-sm font-semibold text-red-700">{error}</p>}{result && <div className="rounded-xl bg-[#e7f5f1] p-4"><p className="text-xs font-bold uppercase tracking-wider text-[#39736c]">Tu contraseña</p><p className="mt-1 font-mono text-xl font-bold text-[#0e615d]">{result}</p></div>}<Button type="submit" className="h-11 w-full bg-[#0e615d] font-bold hover:bg-[#0a4b48]">Verificar PIN</Button></form></ModalShell>;
}

function ResourceModal({ onClose, onAdd }: { onClose: () => void; onAdd: (title: string, url: string, type: ResourceType) => void }) {
  const [type, setType] = useState<ResourceType>('video'); const [title, setTitle] = useState(''); const [url, setUrl] = useState(''); const [error, setError] = useState('');
  function submit(event: { preventDefault(): void }) { event.preventDefault(); try { if (!title.trim()) throw new Error('Escribe un nombre para identificar el recurso.'); if (!url.trim()) throw new Error('Pega el vínculo del recurso.'); onAdd(title, url, type); } catch (reason) { setError(reason instanceof Error ? reason.message : 'No fue posible guardar el recurso.'); } }
  return <ModalShell onClose={onClose}><ModalHeading icon={Plus} title="Registrar recurso" text="Compártelo con el equipo y cada persona podrá marcarlo cuando lo estudie." /><form onSubmit={submit} className="space-y-4"><div><span className="mb-2 block text-sm font-bold">Tipo de recurso</span><div className="grid grid-cols-3 gap-2">{(Object.keys(typeInfo) as ResourceType[]).map((key) => { const info = typeInfo[key]; const Icon = info.icon; return <button key={key} type="button" onClick={() => setType(key)} className={`flex flex-col items-center gap-2 rounded-xl border p-3 text-sm font-bold transition ${type === key ? 'border-[#0e615d] bg-[#e4f2ef] text-[#0e615d]' : 'border-[#dce7e5] text-[#627c79] hover:bg-[#f6f9f8]'}`}><Icon className="size-5" />{info.label}</button>; })}</div></div><label className="block text-sm font-bold">Nombre del recurso<Input value={title} onChange={(event) => setTitle(event.target.value)} className="mt-2 h-11" placeholder="Ej. Guía de evaluación interna" /></label><label className="block text-sm font-bold">Vínculo<Input type="url" value={url} onChange={(event) => setUrl(event.target.value)} className="mt-2 h-11" placeholder="https://…" /></label>{error && <p className="text-sm font-semibold text-red-700">{error}</p>}<Button type="submit" className="h-11 w-full bg-[#d45d3f] text-base font-bold text-white hover:bg-[#bb4d32]">Guardar recurso</Button></form></ModalShell>;
}
