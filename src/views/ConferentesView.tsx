import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  Edit2,
  CheckCircle,
  XCircle,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  UserCheck,
  Building,
} from 'lucide-react';
import { ConferenteUser, UserRole } from '../types';
import { saveConferente } from '../services/storageService';

interface ConferentesViewProps {
  conferentes: ConferenteUser[];
  onUpdateConferentes: (newList: ConferenteUser[]) => void;
  loggedUser: ConferenteUser | null;
}

export const ConferentesView: React.FC<ConferentesViewProps> = ({
  conferentes,
  onUpdateConferentes,
  loggedUser,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterTurno, setFilterTurno] = useState<string>('TODOS');
  const [filterStatus, setFilterStatus] = useState<string>('TODOS');
  const [filterPerfil, setFilterPerfil] = useState<string>('TODOS');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<ConferenteUser | null>(null);

  // Form State
  const [formId, setFormId] = useState<string>('');
  const [formNome, setFormNome] = useState<string>('');
  const [formMatricula, setFormMatricula] = useState<string>('');
  const [formTurno, setFormTurno] = useState<'Turno 1' | 'Turno 2' | 'Turno 3' | 'Administrativo'>('Turno 1');
  const [formPerfil, setFormPerfil] = useState<UserRole>('conferente');
  const [formStatus, setFormStatus] = useState<'Ativo' | 'Inativo'>('Ativo');
  const [formArea, setFormArea] = useState<string>('Operacional Logístico');
  const [formError, setFormError] = useState<string>('');

  const handleOpenNew = () => {
    // Generate next unique ID
    const maxNum = conferentes.reduce((max, c) => {
      const match = c.id.match(/\d+/);
      const num = match ? parseInt(match[0], 10) : 0;
      return num > max ? num : max;
    }, 100);

    setEditingUser(null);
    setFormId(`CONF-${maxNum + 1}`);
    setFormNome('');
    setFormMatricula('');
    setFormTurno('Turno 1');
    setFormPerfil('conferente');
    setFormStatus('Ativo');
    setFormArea('Operacional Logístico');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: ConferenteUser) => {
    setEditingUser(user);
    setFormId(user.id);
    setFormNome(user.nome);
    setFormMatricula(user.matricula);
    setFormTurno(user.turno);
    setFormPerfil(user.perfil);
    setFormStatus(user.status);
    setFormArea(user.areaProducao || 'Operacional Logístico');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formId.trim()) {
      setFormError('O ID do conferente é obrigatório.');
      return;
    }
    if (!formNome.trim()) {
      setFormError('O nome é obrigatório.');
      return;
    }
    if (!formMatricula.trim()) {
      setFormError('A matrícula é obrigatória.');
      return;
    }

    // Check unique ID duplicate if creating new
    if (!editingUser) {
      const exists = conferentes.some((c) => c.id.toLowerCase() === formId.trim().toLowerCase());
      if (exists) {
        setFormError(`O ID ${formId} já existe. Escolha outro ID único.`);
        return;
      }
    }

    const newUser: ConferenteUser = {
      id: formId.trim().toUpperCase(),
      nome: formNome.trim(),
      matricula: formMatricula.trim(),
      turno: formTurno,
      perfil: formPerfil,
      status: formStatus,
      areaProducao: formArea.trim(),
    };

    const updatedList = saveConferente(newUser);
    onUpdateConferentes(updatedList);
    setIsModalOpen(false);
  };

  // Filter List
  const filteredConferentes = conferentes.filter((user) => {
    const matchesSearch =
      user.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.matricula.includes(searchTerm);
    const matchesTurno = filterTurno === 'TODOS' || user.turno === filterTurno;
    const matchesStatus = filterStatus === 'TODOS' || user.status === filterStatus;
    const matchesPerfil = filterPerfil === 'TODOS' || user.perfil === filterPerfil;
    return matchesSearch && matchesTurno && matchesStatus && matchesPerfil;
  });

  return (
    <div className="flex flex-col gap-6 max-w-[1920px] mx-auto p-4 sm:p-6">
      {/* Banner */}
      <div className="bg-slate-900 text-white p-5 rounded-xl border border-slate-800 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-400" />
            <h2 className="text-lg font-black tracking-tight">Cadastro e Controle de Conferentes</h2>
          </div>
          <p className="text-xs text-slate-300 mt-0.5">
            Gerencie os cadastros dos conferentes, supervisores e administradores com IDs únicos para o auto-preenchimento das reservas.
          </p>
        </div>

        <button
          onClick={handleOpenNew}
          className="bg-blue-600 hover:bg-blue-700 text-white font-black text-xs px-4 py-2.5 rounded-lg shadow-sm transition-all flex items-center gap-2 cursor-pointer active:scale-95"
        >
          <UserPlus className="w-4 h-4" />
          <span>Cadastrar Novo Conferente</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por ID, Nome ou Matrícula..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 text-slate-900 pl-9 pr-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Turno Filter */}
          <select
            value={filterTurno}
            onChange={(e) => setFilterTurno(e.target.value)}
            className="bg-slate-50 text-slate-800 p-2 rounded-lg border border-slate-300 font-semibold focus:outline-none focus:border-blue-500"
          >
            <option value="TODOS">Todos os Turnos</option>
            <option value="Turno 1">Turno 1</option>
            <option value="Turno 2">Turno 2</option>
            <option value="Turno 3">Turno 3</option>
            <option value="Administrativo">Administrativo</option>
          </select>

          {/* Perfil Filter */}
          <select
            value={filterPerfil}
            onChange={(e) => setFilterPerfil(e.target.value)}
            className="bg-slate-50 text-slate-800 p-2 rounded-lg border border-slate-300 font-semibold focus:outline-none focus:border-blue-500"
          >
            <option value="TODOS">Todos os Perfis</option>
            <option value="conferente">Conferentes</option>
            <option value="supervisor">Supervisores</option>
            <option value="administrador">Administradores</option>
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-50 text-slate-800 p-2 rounded-lg border border-slate-300 font-semibold focus:outline-none focus:border-blue-500"
          >
            <option value="TODOS">Todos os Status</option>
            <option value="Ativo">Ativos</option>
            <option value="Inativo">Inativos</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-900 text-white font-extrabold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3">ID do Conferente</th>
                <th className="p-3">Nome do Conferente</th>
                <th className="p-3">Matrícula</th>
                <th className="p-3">Turno</th>
                <th className="p-3">Área / Setor</th>
                <th className="p-3 text-center">Perfil</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredConferentes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 font-medium">
                    Nenhum conferente encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredConferentes.map((user) => {
                  const isCurrent = loggedUser?.id === user.id;
                  return (
                    <tr key={user.id} className={`hover:bg-slate-50/80 transition-colors ${isCurrent ? 'bg-blue-50/50' : ''}`}>
                      <td className="p-3 font-mono font-black text-slate-900 flex items-center gap-1.5">
                        <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-300">
                          {user.id}
                        </span>
                        {isCurrent && (
                          <span className="text-[9px] font-bold bg-blue-600 text-white px-1.5 py-0.2 rounded uppercase">
                            Logado
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-bold text-slate-900">{user.nome}</td>
                      <td className="p-3 font-mono text-slate-700">{user.matricula}</td>
                      <td className="p-3 font-medium text-slate-700">{user.turno}</td>
                      <td className="p-3 text-slate-600">{user.areaProducao || 'Operacional Logístico'}</td>
                      <td className="p-3 text-center">
                        <span
                          className={`inline-block text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
                            user.perfil === 'administrador'
                              ? 'bg-purple-100 text-purple-800 border-purple-300'
                              : user.perfil === 'supervisor'
                              ? 'bg-blue-100 text-blue-800 border-blue-300'
                              : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          }`}
                        >
                          {user.perfil}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            user.status === 'Ativo'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                              : 'bg-slate-100 text-slate-500 border border-slate-300'
                          }`}
                        >
                          {user.status === 'Ativo' ? (
                            <CheckCircle className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <XCircle className="w-3 h-3 text-slate-400" />
                          )}
                          <span>{user.status}</span>
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleOpenEdit(user)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-1.5 rounded transition-colors cursor-pointer border border-slate-300"
                          title="Editar Cadastro"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Cadastro / Edição */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm font-black uppercase tracking-wider">
                  {editingUser ? 'Editar Cadastro de Conferente' : 'Cadastrar Novo Conferente'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-5 flex flex-col gap-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                {/* ID do Conferente */}
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-slate-800">ID do Conferente (Único) *</label>
                  <input
                    type="text"
                    value={formId}
                    onChange={(e) => setFormId(e.target.value)}
                    disabled={!!editingUser}
                    placeholder="Ex: CONF-101"
                    className="bg-slate-50 text-slate-900 font-mono font-bold p-2 rounded border border-slate-300 focus:outline-none focus:border-blue-500 disabled:opacity-60"
                    required
                  />
                </div>

                {/* Matrícula */}
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-slate-800">Matrícula *</label>
                  <input
                    type="text"
                    value={formMatricula}
                    onChange={(e) => setFormMatricula(e.target.value)}
                    placeholder="Ex: 102938"
                    className="bg-slate-50 text-slate-900 font-mono p-2 rounded border border-slate-300 focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Nome */}
              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-800">Nome Completo do Conferente *</label>
                <input
                  type="text"
                  value={formNome}
                  onChange={(e) => setFormNome(e.target.value)}
                  placeholder="Ex: Carlos Silva"
                  className="bg-slate-50 text-slate-900 font-bold p-2 rounded border border-slate-300 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              {/* Turno e Perfil */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-bold text-slate-800">Turno de Trabalho *</label>
                  <select
                    value={formTurno}
                    onChange={(e) => setFormTurno(e.target.value as any)}
                    className="bg-slate-50 text-slate-900 font-semibold p-2 rounded border border-slate-300 focus:outline-none focus:border-blue-500"
                  >
                    <option value="Turno 1">Turno 1</option>
                    <option value="Turno 2">Turno 2</option>
                    <option value="Turno 3">Turno 3</option>
                    <option value="Administrativo">Administrativo</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-bold text-slate-800">Perfil de Acesso *</label>
                  <select
                    value={formPerfil}
                    onChange={(e) => setFormPerfil(e.target.value as UserRole)}
                    className="bg-slate-50 text-slate-900 font-semibold p-2 rounded border border-slate-300 focus:outline-none focus:border-blue-500"
                  >
                    <option value="conferente">Conferente</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="administrador">Administrador</option>
                  </select>
                </div>
              </div>

              {/* Área / Setor */}
              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-800">Área / Setor de Operação</label>
                <input
                  type="text"
                  value={formArea}
                  onChange={(e) => setFormArea(e.target.value)}
                  placeholder="Ex: Brassagem / Processos"
                  className="bg-slate-50 text-slate-900 p-2 rounded border border-slate-300 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Status */}
              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-800">Status *</label>
                <div className="flex items-center gap-4 bg-slate-50 p-2 rounded border border-slate-300">
                  <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-800">
                    <input
                      type="radio"
                      name="status"
                      checked={formStatus === 'Ativo'}
                      onChange={() => setFormStatus('Ativo')}
                    />
                    <span className="text-emerald-700">Ativo</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-800">
                    <input
                      type="radio"
                      name="status"
                      checked={formStatus === 'Inativo'}
                      onChange={() => setFormStatus('Inativo')}
                    />
                    <span className="text-slate-500">Inativo</span>
                  </label>
                </div>
              </div>

              {formError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 font-bold rounded flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 mt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2 rounded shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Salvar Conferente</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
