# NEXTCLASS: Core Architectural & Product Principles

This document serves as the canonical source of truth for the NEXTCLASS platform.

## 1. Core Mission
To combat passive learning in engineering education by creating a symbiotic ecosystem where AI-driven tools for Synthesis (Annotations), Retention (Spaced Repetition Flashcards), and Assessment (Adaptive Quizzes) empower both students and teachers.

## 2. Target Audience
The platform is exclusively for Engineering students and professors. All content, examples, and features must be tailored to this domain. Medical or other themes are explicitly out of scope.

## 3. Core Architectural Principles
**Single-Page Application (SPA)**: The entire application will be a fluid, client-side rendered SPA for a seamless user experience.

**Serverless Backend**: All backend logic will be handled by serverless functions (Supabase Edge Functions) for scalability and maintainability.

**Role-Based Access Control (RBAC)**: A strict RBAC system is the backbone of the platform, providing two distinct experiences for 'student' and 'teacher' roles.

## 4. User Experience (UX) Philosophy
**Student Experience**: Designed to be a motivational, proactive, and personalized learning engine. The UI should feel modern, engaging, and guide the student towards their next best action.

**Teacher Experience**: Designed as a "Command Center" or "AI Co-pilot". The UI should be data-rich, professional, and focused on providing actionable insights to empower pedagogical intervention.
