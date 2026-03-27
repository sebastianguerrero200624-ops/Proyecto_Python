document.getElementById("btn-sesion").addEventListener("click", () => {

    // SweetAlert2 en lugar de confirm()
    Swal.fire({
        title: "¿Seguro que deseas cerrar sesión?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Sí, cerrar sesión",
        cancelButtonText: "Cancelar",
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6"
    }).then((result) => {

        // Si el usuario cancela o cierra el modal → no hacemos nada
        if (!result.isConfirmed) {
            return;
        }

        // Logout exactamente igual que antes
        fetch("/logout", {
            method: "POST",
            credentials: "include"
        })
        .then(() => {
            // Mensaje bonito en lugar de alert()
            Swal.fire({
                icon: "success",
                title: "¡Sesión cerrada!",
                text: "Sesión cerrada correctamente",
                timer: 1500,
                showConfirmButton: false
            }).then(() => {
                window.location.href = "/"; // ← funciona igual que antes
            });
        })
        .catch(err => {
            console.error("Error al cerrar sesión:", err);
            Swal.fire({
                icon: "error",
                title: "Error",
                text: "Error al cerrar sesión."
            });
        });

    });
});