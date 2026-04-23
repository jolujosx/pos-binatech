# 🏪 Bina POS
> **Sistema de Punto de Venta (POS) Offline-First para Pequeños Negocios y Zonas Rurales**

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker)
![License](https://img.shields.io/badge/License-MIT-blue)

## 📖 Descripción
**Bina POS** es una aplicación web moderna, ligera y optimizada para operar en entornos con conectividad intermitente o nula. Diseñada específicamente para tiendas pequeñas, abastos y comercios en zonas rurales, permite registrar ventas, gestionar inventario y emitir comprobantes básicos **sin depender de internet**. Cuando la conexión se restaura, los datos se sincronizan automáticamente con la nube.

## ✨ Características Principales
- ✅ **Offline-First:** Registra ventas y gestiona stock localmente usando `IndexedDB`.
- 🔄 **Sincronización Inteligente:** Cola de operaciones pendientes que se envía a Supabase automáticamente al recuperar conexión.
- 👥 **Control de Acceso por Roles:** 
  - 🔑 `admin`: Gestión completa de productos, stock, precios y dashboard.
  - 👤 `cajero`: Interfaz simplificada solo para ventas y escaneo.
- 📱 **Escáner Integrado:** Compatible con cámaras web y lectores de códigos de barras USB.
- 📲 **Comprobantes vía WhatsApp:** Envío opcional de comprobantes usando enlaces `wa.me` (sin APIs costosas ni dependencias externas).
- 🐳 **Entorno Dockerizado & Codespaces:** Desarrollo reproducible, preconfigurado para GitHub Codespaces.
- ⚡ **Deploy Estático:** Optimizado para Vercel, Netlify o cualquier CDN. Carga < 2s.

## 🛠️ Tecnologías
| Capa | Tecnología |
|------|------------|
| **Frontend** | React 18, Vite, React Router, Zustand |
| **Almacenamiento Local** | `idb` (IndexedDB Wrapper) |
| **Backend & Auth** | Supabase (PostgreSQL, RLS, Auth) |
| **Sincronización** | Cola personalizada + Web API `navigator.onLine` |
| **UI/UX** | CSS Nativo optimizado, `react-hot-toast` |
| **DevOps** | Docker, GitHub Codespaces, Vercel |

## 📦 Instalación y Entorno de Desarrollo

### Requisitos Previos
- Node.js `20.x` o superior
- npm o yarn
- Git

### 1️⃣ Clonar el Repositorio
```bash
git clone https://github.com/jolujosx/pos-binatech.git
cd bina-pos
