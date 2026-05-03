export function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
  };
}