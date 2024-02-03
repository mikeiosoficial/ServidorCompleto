        document.getElementById('currentDateTime').value = new Date().toISOString();
    
// Função para exibir o alerta de sucesso
function showSuccessAlert() {
    Swal.fire({
        icon: 'success',
        title: 'Sucesso',
        text: 'Usuário registrado',
    }).then((result) => {
        if (result.isConfirmed) {
            window.location.href = '/registerexternal'; // Redireciona para a rota /register
        }
    });
}

    
// Função para exibir o alerta de erro
function showErrorAlert() {
    Swal.fire({
        icon: 'error',
        title: 'Erro',
        text: 'Erro ao registrar usuário',
    }).then((result) => {
        if (result.isConfirmed) {
            window.location.href = '/registerexternal'; // Redireciona para a rota /register
        }
    });
}

    
// Função para exibir o alerta de login existente
function showExistingLoginAlert() {
    Swal.fire({
        icon: 'info',
        title: 'Erro',
        text: 'Login já existe. Por favor, escolha outro.',
    }).then((result) => {
        if (result.isConfirmed) {
            window.location.href = '/registerexternal'; // Redireciona para a rota /register
        }
    });
}

// Função para exibir o alerta de login existente
function showcreditsAlert() {
    Swal.fire({
        icon: 'info',
        title: 'Créditos insuficientes',
        text: 'Adquira mais créditos com o administrador.',
    }).then((result) => {
        if (result.isConfirmed) {
            window.location.href = '/registerexternal'; // Redireciona para a rota /register
        }
    });
}

    
        // Verifique se há mensagens de sucesso ou erro na URL
        const urlParams = new URLSearchParams(window.location.search);
        const successMessage = urlParams.get('successMessage');
        const errorMessage = urlParams.get('errorMessage');
        const existingLoginAlert = urlParams.get('existingLoginAlert');
        const creditsAlert = urlParams.get('creditsAlert');
    
        if (successMessage) {
            showSuccessAlert();
        }
    
        if (errorMessage) {
            showErrorAlert();
        }
    
        if (existingLoginAlert) {
            showExistingLoginAlert();
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