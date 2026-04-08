# Ley 1801: Asistente Policial Inteligente

## Arquitectura del Sistema

### Frontend (Web & Mobile Responsive)
- **Framework**: React 19 + Vite
- **Estilos**: Tailwind CSS 4
- **Componentes**: Shadcn UI (Radix Primitives)
- **Animaciones**: Motion (framer-motion)
- **Iconos**: Lucide React

### Backend & Persistencia
- **Base de Datos**: Firebase Firestore (NoSQL)
- **Autenticación**: Firebase Auth (Google Login)
- **IA**: Google Gemini 3 Flash (vía @google/genai)
- **Servidor**: Express (para generación de PDF y lógica compleja si se requiere)

### Módulos Principales
1. **Consultor Legal**: Buscador de artículos de la Ley 1801 con interpretación policial.
2. **Generador de Relatos**: IA que redacta relatos técnicos, básicos y expertos.
3. **Guía de Procedimientos**: Paso a paso legal para intervenciones.
4. **Defensa Disciplinaria**: Tips y checklist para evitar investigaciones.
5. **Simulador Operativo**: Entrenamiento basado en casos reales.

## Plan de Desarrollo
1. Configuración de Firebase y Esquema de Datos.
2. Implementación de la Interfaz de Usuario (Dashboard).
3. Integración de Gemini para el Generador de Relatos.
4. Creación del Consultor Legal y Simulador.
5. Pulido de UI/UX y verificación de reglas de seguridad.
