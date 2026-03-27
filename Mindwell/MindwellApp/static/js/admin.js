
const url="http://localhost:8080/admin/usuarios";

const roles={
  1:"Admin",
  2:"Aprendiz",
  3:"Orientador"
};

//  LISTAR 
async function cargarUsuarios(){
    const res=await fetch(url);
    const data=await res.json();
    const tbody=document.querySelector("#tablaUsuarios tbody");
    tbody.innerHTML="";

    data.forEach(u=>{
        tbody.innerHTML+=`
        <tr>
          <td>${u.idUsuario}</td>
          <td>${u.nombreCompleto}</td>
          <td>${u.correo}</td>
          <td>${roles[u.rolId] ?? "Sin Rol"}</td>
          <td>${u.personaId ?? "N/A"}</td>
          <td>
            <button class="btn btn-edit" onclick="editar(${u.idUsuario},'${u.correo}',${u.rolId},${u.personaId})">✏ Editar</button>
            <button class="btn btn-delete" onclick="eliminar(${u.idUsuario})">🗑 Eliminar</button>
          </td>
        </tr>`;
    });
}
cargarUsuarios();

//  EDITAR 
function mostrarForm(){ document.getElementById("formUsuario").style.display="block"; }
function cerrarForm(){ document.getElementById("formUsuario").style.display="none"; }

async function guardarUsuario(){
    const id=document.getElementById("idUsuario").value;
    const correo=document.getElementById("correo").value.trim();
    const rol=document.getElementById("rolId").value;
    const persona=document.getElementById("personaId").value;

    // VALIDACIONES
    if(!correo) return Swal.fire("Campo requerido","Debe ingresar un correo.","warning");
    if(!rol) return Swal.fire("Selección requerida","Debes seleccionar un rol.","warning");
    if(!persona || persona<=0) return Swal.fire("Dato inválido","Ingrese un ID Persona válido.","warning");

    const body={
        correo,
        rolId:parseInt(rol),
        persona:{id_persona:parseInt(persona)}
    };

    let res=await fetch(`${url}/${id}`,{
        method:"PUT",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify(body)
    });

    if(res.ok){
        Swal.fire("✔ Actualizado","Usuario modificado con éxito","success");
        cerrarForm(); cargarUsuarios();
    }else Swal.fire("❌ Error","No se pudo editar","error");
}

//  ELIMINAR 
async function eliminar(id){
    Swal.fire({title:"¿Eliminar usuario?",icon:"warning",showCancelButton:true})
    .then(async res=>{
        if(res.isConfirmed){
           let r=await fetch(`${url}/${id}`,{method:"DELETE"});
           if(r.ok){ Swal.fire("✔ Eliminado","Usuario removido","success"); cargarUsuarios();}
           else Swal.fire("❌ Error","No se pudo eliminar","error");
        }
    });
}

function editar(id,correo,rol,persona){
    mostrarForm();
    document.getElementById("tituloForm").innerText="Editar Usuario";
    document.getElementById("idUsuario").value=id;
    document.getElementById("correo").value=correo;
    document.getElementById("rolId").value=rol;
    document.getElementById("personaId").value=persona;
}