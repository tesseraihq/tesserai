import styled from "styled-components";

export const Button = styled.button`
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.onPrimary};
  border-radius: ${({ theme }) => theme.radii.md}px;
  padding: ${({ theme }) => `${theme.space[2]}px ${theme.space[3]}px`};
  font-family: ${({ theme }) => theme.fonts.body};
`;
