        function showSuccessAlert() {
            Swal.fire({
                icon: 'success',
                title: 'Sucesso',
                text: 'Usuário excluído'
            }).then((result) => {
                if (result.isConfirmed) {
                    window.location.href = '/removeexternal'; // Redireciona para a rota /remove (ou outra rota apropriada)
                }
            });
        }

        // Função para exibir o alerta de erro
        function showErrorAlert() {
            Swal.fire({
                icon: 'error',
                title: 'Erro',
                text: 'Erro ao excluir usuário'
            }).then((result) => {
                if (result.isConfirmed) {
                    window.location.href = '/removeexternal'; // Redireciona para a rota /remove (ou outra rota apropriada)
                }
            });
        }

        // Função para exibir o alerta de login inexistente
        function showNonexistentLoginAlert() {
            Swal.fire({
                icon: 'info',
                title: 'Login não encontrado',
                text: 'Login não encontrado. Verifique o nome de usuário'
            }).then((result) => {
                if (result.isConfirmed) {
                    window.location.href = '/removeexternal'; // Redireciona para a rota /login (ou outra rota apropriada)
                }
            });
        }

        // Função para exibir o alerta de erro de remoção
        function showErrorRemoveAlert() {
            Swal.fire({
                icon: 'error',
                title: 'Erro ao remover',
                text: 'Não é possível remover logins de outros vendedores'
            }).then((result) => {
                if (result.isConfirmed) {
                    window.location.href = '/removeexternal'; // Redireciona para a rota /remove (ou outra rota apropriada)
                }
            });
        }


        function showSuccessAlertVendedor() {
            Swal.fire({
                icon: 'success',
                title: 'Sucesso',
                text: 'Vendedor excluído'
            }).then((result) => {
                if (result.isConfirmed) {
                    window.location.href = '/removeexternal'; // Redireciona para a rota /remove (ou outra rota apropriada)
                }
            });
        }




    // Verifique se há mensagens de sucesso ou erro na URL
    const urlParams = new URLSearchParams(window.location.search);
    const successMessage = urlParams.get('successMessage');
    const errorMessage = urlParams.get('errorMessage');
    const nonexistentLoginAlert = urlParams.get('nonexistentLoginAlert');
    const errorRemoveAlert = urlParams.get('errorRemoveAlert');
    const SuccessAlertVendedor = urlParams.get('SuccessAlertVendedor');

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
        showErrorRemoveAlert();
    }

    if (SuccessAlertVendedor) {
        showSuccessAlertVendedor();
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