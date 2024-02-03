        function showSuccessAlert() {
            Swal.fire({
                icon: 'success',
                title: 'Sucesso',
                text: 'Usuário renovado'
            }).then((result) => {
                if (result.isConfirmed) {
                    window.location.href = '/add-days-external'; // Redireciona para a rota /remove (ou outra rota apropriada)
                }
            });
        }

        // Função para exibir o alerta de erro
        function showErrorAlert() {
            Swal.fire({
                icon: 'error',
                title: 'Erro',
                text: 'Erro ao renovar usuário'
            }).then((result) => {
                if (result.isConfirmed) {
                    window.location.href = '/add-days-external'; // Redireciona para a rota /remove (ou outra rota apropriada)
                }
            });
        }


        // Função para exibir o alerta de login inexistente
        function showNonexistentLoginAlert() {
            Swal.fire({
                icon: 'error',
                title: 'Erro',
                text: 'Login não encontrado'
            }).then((result) => {
                if (result.isConfirmed) {
                    window.location.href = '/add-days-external'; // Redireciona para a rota /login (ou outra rota apropriada)
                }
            });
        }


        // Função para exibir o alerta de erro de remoção
        function showErrorAddAlert() {
            Swal.fire({
                icon: 'error',
                title: 'Erro',
                text: 'Não é possível renovar logins de outros vendedores'
            }).then((result) => {
                if (result.isConfirmed) {
                    window.location.href = '/add-days-external'; // Redireciona para a rota /remove (ou outra rota apropriada)
                }
            });
        }

      
// Função para exibir o alerta de login existente
function showcreditsAlert() {
    Swal.fire({
        icon: 'info',
        title: 'Erro',
        text: 'Créditos insuficientes.',
    }).then((result) => {
        if (result.isConfirmed) {
            window.location.href = '/add-days-external'; // Redireciona para a rota /register
        }
    });
}

    const urlParams = new URLSearchParams(window.location.search);
    const successMessage = urlParams.get('successMessage');
    const errorMessage = urlParams.get('errorMessage');
    const nonexistentLoginAlert = urlParams.get('nonexistentLoginAlert');
    const errorRemoveAlert = urlParams.get('ErrorAddAlert');
        const creditsAlert = urlParams.get('creditsAlert');

    if (successMessage) {
        showSuccessAlert();
    }

    if (errorMessage) {
        showErrorAlert();
    }

    if (nonexistentLoginAlert) {
        showNonexistentLoginAlert();
    }

    if (errorRemoveAlert) {
        showErrorAddAlert();
    }
      
    if (creditsAlert) {
        showcreditsAlert();
      
    }
    

        document.addEventListener('DOMContentLoaded', function () {
            const sideLinks = document.querySelectorAll('.sidebar .side-menu li a:not(.logout)');

            sideLinks.forEach(item => {
                const li = item.parentElement;
                item.addEventListener('click', () => {
                    sideLinks.forEach(i => {
                        i.parentElement.classList.remove('active');
                    })
                    li.classList.add('active');
                })
            });

            const menuBar = document.querySelector('.content nav .bx.bx-menu');
            const sideBar = document.querySelector('.sidebar');

            menuBar.addEventListener('click', () => {
                sideBar.classList.toggle('close');
            });

            const searchBtn = document.querySelector('.content nav form .form-input button');
            const searchBtnIcon = document.querySelector('.content nav form .form-input button .bx');
            const searchForm = document.querySelector('.content nav form');

            searchBtn.addEventListener('click', function (e) {
                if (window.innerWidth < 576) {
                    e.preventDefault();
                    searchForm.classList.toggle('show');
                    if (searchForm.classList.contains('show')) {
                        searchBtnIcon.classList.replace('bx-search', 'bx-x');
                    } else {
                        searchBtnIcon.classList.replace('bx-x', 'bx-search');
                    }
                }
            });

            window.addEventListener('resize', () => {
                if (window.innerWidth < 768) {
                    sideBar.classList.add('close');
                } else {
                    sideBar.classList.remove('close');
                }
                if (window.innerWidth > 576) {
                    searchBtnIcon.classList.replace('bx-x', 'bx-search');
                    searchForm.classList.remove('show');
                }
            });

            const toggler = document.getElementById('theme-toggle');

            toggler.addEventListener('change', function () {
                if (this.checked) {
                    document.body.classList.add('dark');
                } else {
                    document.body.classList.remove('dark');
                }
            });
        });

    document.addEventListener('DOMContentLoaded', function() {
      document.querySelector('.logout1').addEventListener('click', function(event) {
        event.preventDefault(); // Impede o comportamento padrão do link

        Swal.fire({
          icon: 'info',
          title: 'Em breve!',
          text: 'A opção de compra de créditos estará disponível em breve.',
        });
      });
    });