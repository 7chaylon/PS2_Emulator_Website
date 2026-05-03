export function requireAdmin(req, res, next) {
  if (!req.session?.user) {
    return res.status(401).json({
      ok: false,
      message: 'Não autenticado.',
    });
  }

  if (req.session.user.role !== 'admin') {
    return res.status(403).json({
      ok: false,
      message: 'Acesso permitido apenas para administradores.',
    });
  }

  next();
}