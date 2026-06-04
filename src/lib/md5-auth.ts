import md5 from 'md5';

export const hashPassword = (password: string): string => {
  return md5(password);
};
