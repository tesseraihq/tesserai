import './styles/main.scss'

document.querySelectorAll('.notification .delete').forEach((button) => {
  button.addEventListener('click', () => button.parentNode.remove())
})
