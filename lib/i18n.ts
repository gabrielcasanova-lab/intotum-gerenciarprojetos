// Textos da parte do sistema que clientes e parceiros usam, em português e
// espanhol. As telas de administração (projetos, usuários) ficam só em
// português. O que os usuários digitam (nomes de atividades, comentários)
// aparece como foi escrito: não é traduzido.

import type { ImplementationStatus, Priority, Status } from "@/lib/labels";

export const LANGUAGES = ["pt", "es"] as const;
export type Language = (typeof LANGUAGES)[number];

export const languageName: Record<Language, string> = {
  pt: "Português",
  es: "Español",
};

export function isLanguage(value: unknown): value is Language {
  return value === "pt" || value === "es";
}

/** Nome do cookie que guarda o idioma das telas antes do login. */
export const LANGUAGE_COOKIE = "idioma";

const pt = {
  locale: "pt-BR",
  status: {
    nao_iniciado: "Não iniciado",
    iniciado: "Iniciado",
    concluido: "Concluído",
    aguardando_cliente: "Aguardando cliente",
    bloqueado: "Bloqueado",
  } satisfies Record<Status, string>,
  implementationStatus: {
    iniciado: "Em andamento",
    finalizado: "Finalizado",
    cancelado: "Cancelado",
  } satisfies Record<ImplementationStatus, string>,
  priority: {
    baixa: "Baixa",
    media: "Média",
    alta: "Alta",
    urgente: "Urgente",
  } satisfies Record<Priority, string>,
  role: { admin: "Administrador", equipe: "Equipe", cliente: "Cliente" },

  // Cabeçalho e lista de clientes
  appName: "Intotum Projetos",
  navClients: "Clientes",
  navProjects: "Projetos",
  navUsers: "Usuários",
  logout: "Sair",
  languageLabel: "Idioma",
  clientsTitle: "Clientes",
  loading: "Carregando…",
  noClientsAdmin: "Nenhum cliente cadastrado ainda.",
  noClientsUser:
    "Você ainda não foi vinculado a nenhum projeto. Fale com o administrador.",
  levelEdit: "Edição",
  levelView: "Visualização",

  // Página do cliente
  backToClients: "← Clientes",
  implementationStatusTitle: "Situação da implantação",
  downloadPdf: "Baixar PDF",
  pdfWithComments: "PDF com comentários para o cliente",
  noModules: "Nenhum módulo ativado para este cliente ainda.",
  removeModule: "Remover módulo",
  confirmRemoveModule: (m: string) =>
    `Remover o módulo ${m} e todas as atividades dele?`,
  renameModule: "Renomear módulo",
  newNameOf: (m: string) => `Novo nome de ${m}`,
  saveName: "Salvar nome",
  noActivities: "Sem atividades.",
  newActivity: "Nova atividade",
  newActivityIn: (m: string) => `Nova atividade em ${m}`,
  inside: "Dentro de",
  mainActivity: "Atividade principal",
  subactivityOf: "Subatividade de",
  add: "Adicionar",
  statusOf: (a: string) => `Status de ${a}`,
  deleteNamed: (a: string) => `Excluir ${a}`,
  deleteActivity: "Excluir atividade",
  confirmDeleteActivityFromList: (a: string) =>
    `Excluir a atividade "${a}" deste cliente? Os comentários dela também serão apagados.`,
  moveUp: (m: string) => `Subir ${m}`,
  moveDown: (m: string) => `Descer ${m}`,
  trainings: "Treinamentos gravados",
  noTrainings: "Nenhum treinamento gravado ainda.",
  remove: "Remover",
  confirmRemoveVideo: (v: string) =>
    `Remover o link "${v}"? O vídeo em si não é apagado.`,
  title: "Título",
  titlePlaceholder: "Ex.: Treinamento de Estoque",
  videoLink: "Link do vídeo",
  date: "Data",
  activateModules: "Ativar módulos do catálogo (marque um ou vários)",
  alreadyActive: "(já ativado)",
  emptyCatalog: "O catálogo deste projeto está vazio.",
  looseModule: "Módulo avulso (opcional, fora do catálogo)",
  activateButton: "Ativar módulos",

  // Página da atividade
  name: "Nome",
  description: "Descrição",
  statusField: "Status",
  priorityField: "Prioridade",
  assignee: "Responsável (Intotum)",
  clientContact: "Contato no cliente",
  start: "Início",
  due: "Prazo",
  completed: "Conclusão",
  autoDatesHint:
    "Datas automáticas: quando a atividade sai de Não iniciado, o Início vazio recebe a data de hoje; quando fica Concluída, a Conclusão vazia também.",
  save: "Salvar",
  attachments: "Anexos",
  noAttachments: "Nenhum anexo.",
  removedUser: "Usuário removido",
  internal: "Interno",
  clientSees: "Cliente vê",
  deleteAttachment: "Excluir anexo",
  confirmDeleteAttachment: (f: string) => `Excluir o anexo "${f}"?`,
  fileUpTo: "Arquivo (até 20 MB)",
  fileTooBig: (mb: number) => `Arquivo maior que ${mb} MB.`,
  whoSees: "Quem vê",
  teamOnly: "Só a equipe",
  teamAndClient: "Equipe e cliente",
  attach: "Anexar",
  internalComments: "Comentários internos",
  clientComments: "Comentários para o cliente",
  internalHint: "Só a equipe da Intotum vê.",
  clientHint: "O cliente vê estes comentários.",
  noComments: "Nenhum comentário.",
  internalPlaceholder: "Comentário interno",
  clientPlaceholder: "Comentário que o cliente vai ver",
  comment: "Comentar",
  confirmDeleteActivity: (a: string) =>
    `Excluir a atividade "${a}" e os comentários dela?`,

  // PDF
  pdf: {
    implementation: "Implantação",
    percentDone: "concluído",
    doneOf: (done: number, total: number) => `${done} de ${total}`,
    activitiesDone: "atividades concluídas",
    waitingClient: "aguardando cliente",
    overdue: "com prazo vencido",
    noModules: "Nenhum módulo ativado.",
    modulePct: (pct: number) => `${pct}% concluído`,
    activity: "Atividade",
    status: "Status",
    assignee: "Responsável",
    start: "Início",
    completed: "Conclusão",
    priority: (p: string) => `prioridade ${p}`,
    trainings: "Treinamentos gravados",
    generatedAt: (d: string) => `Gerado em ${d}`,
    page: (n: number, total: number) => `Página ${n} de ${total}`,
    fileName: (client: string, date: string) => `Andamento - ${client} - ${date}.pdf`,
  },

  // Login, convite e senha
  auth: {
    loginTitle: "Intotum Projetos",
    loginSubtitle: "Entre com seu e-mail e senha.",
    email: "E-mail",
    password: "Senha",
    entering: "Entrando…",
    enter: "Entrar",
    forgot: "Esqueci minha senha",
    invalidEmail: "Informe um e-mail válido.",
    passwordRequired: "Informe a senha.",
    invalidLogin: "E-mail ou senha incorretos.",
    locked:
      "Acesso bloqueado temporariamente por excesso de tentativas. Tente de novo em alguns minutos.",
    forgotSubtitle: "Enviamos um link para o seu e-mail criar uma senha nova.",
    backToLogin: "← Voltar para o login",
    forgotDone:
      "Se o e-mail estiver cadastrado, enviamos um link para criar uma nova senha. Ele vale por 2 horas.",
    sending: "Enviando…",
    sendLink: "Enviar link",
    mailOff: "O envio de e-mail não está ativo. Fale com o administrador.",
    createPasswordTitle: "Criar senha",
    invalidLinkTitle: "Link inválido",
    invalidLinkBefore:
      "Este link expirou ou já foi usado. Peça um novo ao administrador ou use",
    welcome: (n: string) => `Bem-vindo, ${n}`,
    newPasswordTitle: "Nova senha",
    createPasswordOf: (e: string) => `Crie a senha de ${e}.`,
    newPassword: "Nova senha",
    repeatPassword: "Repita a senha",
    saving: "Salvando…",
    savePassword: "Salvar senha e entrar",
    passwordMin: "A senha precisa ter pelo menos 8 caracteres.",
    passwordMismatch: "As duas senhas não são iguais.",
    linkExpired: "Este link expirou ou já foi usado. Peça um novo.",
  },

  // E-mails
  mail: {
    inviteSubject: "Convite: Intotum Projetos",
    resetSubject: "Redefinição de senha: Intotum Projetos",
    invite: (name: string, link: string, login: string, email: string) =>
      `Olá, ${name}.\n\nVocê foi convidado para acompanhar os projetos da Intotum.\n` +
      `Crie sua senha neste link (válido por 7 dias):\n\n${link}\n\n` +
      `Depois, entre sempre por ${login} com o e-mail ${email}.`,
    reset: (name: string, link: string) =>
      `Olá, ${name}.\n\nRecebemos um pedido para redefinir sua senha.\n` +
      `Crie uma nova senha neste link (válido por 2 horas):\n\n${link}\n\n` +
      `Se não foi você, ignore este e-mail; sua senha atual continua valendo.`,
  },
};

export type Dictionary = typeof pt;

const es: Dictionary = {
  locale: "es",
  status: {
    nao_iniciado: "No iniciado",
    iniciado: "Iniciado",
    concluido: "Concluido",
    aguardando_cliente: "Esperando al cliente",
    bloqueado: "Bloqueado",
  },
  implementationStatus: {
    iniciado: "En curso",
    finalizado: "Finalizado",
    cancelado: "Cancelado",
  },
  priority: {
    baixa: "Baja",
    media: "Media",
    alta: "Alta",
    urgente: "Urgente",
  },
  role: { admin: "Administrador", equipe: "Equipo", cliente: "Cliente" },

  appName: "Intotum Proyectos",
  navClients: "Clientes",
  navProjects: "Proyectos",
  navUsers: "Usuarios",
  logout: "Salir",
  languageLabel: "Idioma",
  clientsTitle: "Clientes",
  loading: "Cargando…",
  noClientsAdmin: "Todavía no hay clientes registrados.",
  noClientsUser:
    "Todavía no fue vinculado a ningún proyecto. Hable con el administrador.",
  levelEdit: "Edición",
  levelView: "Consulta",

  backToClients: "← Clientes",
  implementationStatusTitle: "Estado de la implementación",
  downloadPdf: "Descargar PDF",
  pdfWithComments: "PDF con comentarios para el cliente",
  noModules: "Todavía no hay módulos activados para este cliente.",
  removeModule: "Quitar módulo",
  confirmRemoveModule: (m) => `¿Quitar el módulo ${m} y todas sus actividades?`,
  renameModule: "Renombrar módulo",
  newNameOf: (m) => `Nuevo nombre de ${m}`,
  saveName: "Guardar nombre",
  noActivities: "Sin actividades.",
  newActivity: "Nueva actividad",
  newActivityIn: (m) => `Nueva actividad en ${m}`,
  inside: "Dentro de",
  mainActivity: "Actividad principal",
  subactivityOf: "Subactividad de",
  add: "Agregar",
  statusOf: (a) => `Estado de ${a}`,
  deleteNamed: (a) => `Eliminar ${a}`,
  deleteActivity: "Eliminar actividad",
  confirmDeleteActivityFromList: (a) =>
    `¿Eliminar la actividad "${a}" de este cliente? También se borrarán sus comentarios.`,
  moveUp: (m) => `Subir ${m}`,
  moveDown: (m) => `Bajar ${m}`,
  trainings: "Capacitaciones grabadas",
  noTrainings: "Todavía no hay capacitaciones grabadas.",
  remove: "Quitar",
  confirmRemoveVideo: (v) => `¿Quitar el enlace "${v}"? El video en sí no se borra.`,
  title: "Título",
  titlePlaceholder: "Ej.: Capacitación de Inventario",
  videoLink: "Enlace del video",
  date: "Fecha",
  activateModules: "Activar módulos del catálogo (marque uno o varios)",
  alreadyActive: "(ya activado)",
  emptyCatalog: "El catálogo de este proyecto está vacío.",
  looseModule: "Módulo suelto (opcional, fuera del catálogo)",
  activateButton: "Activar módulos",

  name: "Nombre",
  description: "Descripción",
  statusField: "Estado",
  priorityField: "Prioridad",
  assignee: "Responsable (Intotum)",
  clientContact: "Contacto en el cliente",
  start: "Inicio",
  due: "Plazo",
  completed: "Conclusión",
  autoDatesHint:
    "Fechas automáticas: cuando la actividad deja No iniciado, el Inicio vacío recibe la fecha de hoy; cuando queda Concluida, la Conclusión vacía también.",
  save: "Guardar",
  attachments: "Adjuntos",
  noAttachments: "Sin adjuntos.",
  removedUser: "Usuario eliminado",
  internal: "Interno",
  clientSees: "Visible al cliente",
  deleteAttachment: "Eliminar adjunto",
  confirmDeleteAttachment: (f) => `¿Eliminar el adjunto "${f}"?`,
  fileUpTo: "Archivo (hasta 20 MB)",
  fileTooBig: (mb) => `Archivo mayor que ${mb} MB.`,
  whoSees: "Quién lo ve",
  teamOnly: "Solo el equipo",
  teamAndClient: "Equipo y cliente",
  attach: "Adjuntar",
  internalComments: "Comentarios internos",
  clientComments: "Comentarios para el cliente",
  internalHint: "Solo el equipo de Intotum los ve.",
  clientHint: "El cliente ve estos comentarios.",
  noComments: "Sin comentarios.",
  internalPlaceholder: "Comentario interno",
  clientPlaceholder: "Comentario que verá el cliente",
  comment: "Comentar",
  confirmDeleteActivity: (a) => `¿Eliminar la actividad "${a}" y sus comentarios?`,

  pdf: {
    implementation: "Implementación",
    percentDone: "concluido",
    doneOf: (done, total) => `${done} de ${total}`,
    activitiesDone: "actividades concluidas",
    waitingClient: "esperando al cliente",
    overdue: "con plazo vencido",
    noModules: "No hay módulos activados.",
    modulePct: (pct) => `${pct}% concluido`,
    activity: "Actividad",
    status: "Estado",
    assignee: "Responsable",
    start: "Inicio",
    completed: "Conclusión",
    priority: (p) => `prioridad ${p}`,
    trainings: "Capacitaciones grabadas",
    generatedAt: (d) => `Generado el ${d}`,
    page: (n, total) => `Página ${n} de ${total}`,
    fileName: (client, date) => `Avance - ${client} - ${date}.pdf`,
  },

  auth: {
    loginTitle: "Intotum Proyectos",
    loginSubtitle: "Ingrese con su correo y contraseña.",
    email: "Correo electrónico",
    password: "Contraseña",
    entering: "Ingresando…",
    enter: "Ingresar",
    forgot: "Olvidé mi contraseña",
    invalidEmail: "Ingrese un correo válido.",
    passwordRequired: "Ingrese la contraseña.",
    invalidLogin: "Correo o contraseña incorrectos.",
    locked:
      "Acceso bloqueado temporalmente por demasiados intentos. Inténtelo de nuevo en unos minutos.",
    forgotSubtitle: "Le enviaremos un enlace a su correo para crear una contraseña nueva.",
    backToLogin: "← Volver al inicio de sesión",
    forgotDone:
      "Si el correo está registrado, le enviamos un enlace para crear una contraseña nueva. Es válido por 2 horas.",
    sending: "Enviando…",
    sendLink: "Enviar enlace",
    mailOff: "El envío de correos no está activo. Hable con el administrador.",
    createPasswordTitle: "Crear contraseña",
    invalidLinkTitle: "Enlace inválido",
    invalidLinkBefore:
      "Este enlace venció o ya fue usado. Pida uno nuevo al administrador o use",
    welcome: (n) => `Bienvenido, ${n}`,
    newPasswordTitle: "Nueva contraseña",
    createPasswordOf: (e) => `Cree la contraseña de ${e}.`,
    newPassword: "Nueva contraseña",
    repeatPassword: "Repita la contraseña",
    saving: "Guardando…",
    savePassword: "Guardar contraseña e ingresar",
    passwordMin: "La contraseña debe tener al menos 8 caracteres.",
    passwordMismatch: "Las dos contraseñas no coinciden.",
    linkExpired: "Este enlace venció o ya fue usado. Pida uno nuevo.",
  },

  mail: {
    inviteSubject: "Invitación: Intotum Proyectos",
    resetSubject: "Restablecer contraseña: Intotum Proyectos",
    invite: (name, link, login, email) =>
      `Hola, ${name}.\n\nFue invitado a seguir los proyectos de Intotum.\n` +
      `Cree su contraseña en este enlace (válido por 7 días):\n\n${link}\n\n` +
      `Después, ingrese siempre por ${login} con el correo ${email}.`,
    reset: (name, link) =>
      `Hola, ${name}.\n\nRecibimos una solicitud para restablecer su contraseña.\n` +
      `Cree una contraseña nueva en este enlace (válido por 2 horas):\n\n${link}\n\n` +
      `Si no fue usted, ignore este correo; su contraseña actual sigue siendo válida.`,
  },
};

const dictionaries: Record<Language, Dictionary> = { pt, es };

export function dictionary(language: Language): Dictionary {
  return dictionaries[language] ?? pt;
}

/** Data e hora no fuso de Brasília, no formato do idioma. */
export function dateTimeFormat(language: Language) {
  return new Intl.DateTimeFormat(dictionary(language).locale, {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  });
}
