-- BeProud · Fase 2 — Seed de catálogo (80 tareas, idempotente vía slug).
-- Aplicada vía MCP el 2026-04-25.
-- Si reseteas la BBDD local con `pnpm supabase:reset`, esta migración recrea
-- el catálogo. El mismo contenido también está en supabase/seed.sql para
-- entornos donde se prefiera cargar el catálogo aparte.

insert into public.tasks_catalog (slug, title, description, category, base_points, icon, photo_hint) values
-- ===== FITNESS (20) =====
('gym_session','Sesión de gym','Entrenamiento completo en el gimnasio.','fitness',60,'🏋️','Foto en el gimnasio: máquinas, pesas o espejo de la sala.'),
('run_30min','Correr 30 minutos','Carrera continua de al menos 30 minutos.','fitness',40,'🏃','App de running con tiempo y distancia, o foto al aire libre tras correr.'),
('walk_30min','Caminar 30 minutos','Paseo enérgico de 30 minutos.','fitness',15,'🚶','Foto al aire libre o de la app de pasos.'),
('walk_10k_steps','10.000 pasos','Completar 10.000 pasos en el día.','fitness',20,'👟','Captura de la app de pasos mostrando ≥10.000.'),
('cycling_1h','Bicicleta 1 hora','Salida en bici de al menos una hora.','fitness',40,'🚴','Bici, casco o vista del trayecto al aire libre.'),
('pushups_50','50 flexiones','50 flexiones repartidas en el día.','fitness',15,'💪','Foto haciendo flexiones o resultado de la app de entrenamiento.'),
('pullups_10','10 dominadas','10 dominadas estrictas.','fitness',20,'💪','Foto en la barra o vídeo capturado.'),
('squats_100','100 sentadillas','100 sentadillas en el día.','fitness',20,'🦵','Foto haciendo sentadillas.'),
('yoga_session','Sesión de yoga','Sesión completa de yoga (~30 min).','fitness',25,'🧘','Foto en mat de yoga.'),
('stretching_15min','Estiramientos 15 min','Rutina de estiramientos.','fitness',10,'🤸','Foto haciendo estiramientos.'),
('swim_30min','Nadar 30 minutos','Nadar 30 minutos continuos.','fitness',40,'🏊','Foto en piscina/playa o gorro y gafas.'),
('hiit_20min','HIIT 20 minutos','Sesión de alta intensidad por intervalos.','fitness',35,'⚡','Foto post-entrenamiento o app de HIIT.'),
('hike_outdoor','Senderismo','Ruta de senderismo al aire libre.','fitness',45,'🥾','Foto del paisaje o sendero.'),
('sports_match','Partido deportivo','Jugar un partido (fútbol, pádel, baloncesto…).','fitness',40,'⚽','Foto del partido o pista.'),
('dance_class','Clase de baile','Clase o sesión de baile.','fitness',30,'💃','Foto en la sala de baile.'),
('climbing_session','Escalada','Sesión de escalada o boulder.','fitness',50,'🧗','Foto en el rocódromo o roca.'),
('martial_arts_class','Clase de artes marciales','Clase de boxeo, judo, karate, BJJ…','fitness',40,'🥋','Foto en el dojo o con kimono/guantes.'),
('core_workout','Entrenamiento de core','Rutina enfocada al núcleo.','fitness',20,'🔥','Foto haciendo abdominales/plancha.'),
('leg_day','Día de pierna','Entrenamiento completo de tren inferior.','fitness',50,'🦵','Foto en jaula de sentadillas o prensa.'),
('upper_body_workout','Entrenamiento de torso','Pecho, espalda, hombros y brazos.','fitness',50,'💪','Foto en banco/press o mancuernas.'),

-- ===== STUDY (15) =====
('read_30min','Leer 30 minutos','Lectura concentrada de 30 minutos.','study',20,'📖','Foto del libro abierto o e-reader.'),
('read_book_chapter','Leer un capítulo','Terminar un capítulo entero.','study',15,'📚','Foto del libro/capítulo terminado.'),
('language_duolingo','Sesión Duolingo','Completar la sesión diaria.','study',10,'🦉','Captura de la app con la sesión completada.'),
('language_practice_30min','Practicar idioma 30 min','Estudio de idiomas 30 min.','study',20,'🗣️','Foto del cuaderno o app de idiomas.'),
('online_course_lesson','Lección de curso online','Una lección entera (Coursera, Udemy…).','study',20,'💻','Captura de la lección o certificado de avance.'),
('study_session_1h','Sesión de estudio 1 hora','1 hora estudiando con foco.','study',30,'📝','Foto del escritorio con apuntes y temporizador.'),
('take_notes','Tomar apuntes','Tomar apuntes estructurados de un tema.','study',15,'✍️','Foto de los apuntes.'),
('practice_problems','Hacer ejercicios','Resolver ejercicios o problemas.','study',20,'🧩','Foto de los ejercicios resueltos.'),
('flashcards_review','Repasar flashcards','Sesión de Anki/Quizlet.','study',10,'🃏','Captura de la app de flashcards.'),
('write_summary','Escribir resumen','Resumen de un tema o capítulo.','study',20,'📄','Foto del resumen escrito o documento.'),
('watch_educational_video','Ver vídeo educativo','Vídeo o documental educativo.','study',10,'🎬','Captura del vídeo o app educativa.'),
('podcast_education','Podcast educativo','Episodio educativo escuchado completo.','study',10,'🎧','Captura de la app de podcast con el episodio.'),
('coding_kata','Kata de programación','Resolver un kata o reto de código.','study',30,'💻','Captura del editor con el código resuelto.'),
('memorize_vocab','Memorizar vocabulario','Memorizar 20+ palabras nuevas.','study',10,'🧠','Foto de la lista de vocabulario.'),
('research_topic','Investigar un tema','Investigación sobre un tema.','study',25,'🔎','Captura de notas o pestañas con fuentes.'),

-- ===== NUTRITION (10) =====
('healthy_breakfast','Desayuno saludable','Desayuno equilibrado y casero.','nutrition',10,'🥑','Foto del desayuno preparado.'),
('healthy_lunch','Comida saludable','Comida equilibrada.','nutrition',15,'🥗','Foto del plato.'),
('healthy_dinner','Cena saludable','Cena ligera y equilibrada.','nutrition',15,'🍲','Foto del plato.'),
('drink_2l_water','Beber 2L de agua','Hidratación adecuada.','nutrition',15,'💧','Foto de la botella(s) o app de hidratación.'),
('meal_prep','Meal prep','Preparar comidas para varios días.','nutrition',30,'🥘','Foto de los tuppers preparados.'),
('home_cooking','Cocinar en casa','Cocinar una comida completa en casa.','nutrition',20,'🍳','Foto de la cocina o el plato cocinado.'),
('no_junk_food','Día sin comida basura','Sin azúcar refinada, fritos ni ultraprocesados.','nutrition',20,'🚫','Foto del menú del día.'),
('fruit_serving','Comer fruta','Al menos una pieza de fruta.','nutrition',5,'🍎','Foto de la fruta consumida.'),
('vegetables_serving','Comer verduras','Ración de verduras en alguna comida.','nutrition',10,'🥦','Foto del plato con verdura.'),
('track_calories','Registrar comidas','Registrar todo lo comido en una app.','nutrition',10,'📊','Captura de la app de tracking.'),

-- ===== WELLBEING (10) =====
('meditate_10min','Meditar 10 min','Meditación guiada o silenciosa.','wellbeing',15,'🧘','Captura de la app de meditación o lugar tranquilo.'),
('meditate_20min','Meditar 20 min','Sesión más larga de meditación.','wellbeing',25,'🧘‍♂️','Captura de la app o lugar de meditación.'),
('journal_entry','Entrada de diario','Escribir entrada del día en un diario.','wellbeing',15,'📓','Foto de la página escrita.'),
('gratitude_list','Lista de gratitud','Apuntar 3 cosas por las que estoy agradecido.','wellbeing',10,'🙏','Foto de la lista escrita.'),
('deep_sleep','Dormir 8 horas','Sueño reparador de al menos 8h.','wellbeing',20,'😴','Captura de la app de sueño.'),
('no_social_media','Día sin redes sociales','24h sin abrir redes.','wellbeing',30,'📵','Captura del tiempo en pantalla mostrando 0 en redes.'),
('digital_detox_hour','1h sin pantallas','60 minutos sin móvil ni pantallas.','wellbeing',10,'🌿','Foto de actividad sin pantallas.'),
('breathing_exercise','Ejercicio de respiración','Sesión de respiración consciente.','wellbeing',10,'🌬️','Captura de app de respiración o foto.'),
('cold_shower','Ducha fría','Ducha fría de al menos 2 min.','wellbeing',15,'🚿','Foto post-ducha o ducha encendida.'),
('nature_walk','Paseo por la naturaleza','Paseo en un entorno natural.','wellbeing',20,'🌳','Foto del paisaje natural.'),

-- ===== PRODUCTIVITY (15) =====
('deep_work_1h','Deep work 1h','1 hora de trabajo profundo sin interrupciones.','productivity',30,'🎯','Foto del escritorio o temporizador completo.'),
('deep_work_2h','Deep work 2h','2 horas de trabajo profundo.','productivity',50,'🎯','Foto del escritorio o sesiones de pomodoro.'),
('inbox_zero','Inbox zero','Bandeja de entrada a 0.','productivity',15,'📭','Captura del email vacío.'),
('complete_task_list','Lista de tareas completada','Terminar la lista de tareas del día.','productivity',25,'✅','Captura de la lista con todo marcado.'),
('pomodoro_4','4 pomodoros','Completar 4 pomodoros (≥100 min foco).','productivity',30,'🍅','Captura de la app de pomodoro.'),
('plan_tomorrow','Planificar mañana','Plan del día siguiente escrito.','productivity',10,'📅','Foto del plan/agenda.'),
('weekly_review','Review semanal','Revisión completa de la semana.','productivity',30,'🗓️','Foto del cuaderno o app con el review.'),
('clean_desk','Ordenar escritorio','Dejar el escritorio limpio.','productivity',10,'🧹','Foto del escritorio ordenado.'),
('organize_files','Organizar archivos','Organizar archivos digitales.','productivity',20,'📁','Captura de carpetas organizadas.'),
('no_phone_morning','Móvil después de las 10','No abrir el móvil hasta las 10:00.','productivity',20,'📵','Captura del tiempo de uso por la mañana.'),
('wake_up_early','Levantarse antes de las 7','Despertar a las 7:00 o antes.','productivity',15,'🌅','Captura de la alarma o reloj.'),
('finish_project','Completar un proyecto','Terminar un proyecto pendiente.','productivity',50,'🏁','Captura del proyecto finalizado.'),
('write_blog_post','Escribir un post','Publicar un post en blog/redes.','productivity',40,'✏️','Captura del post publicado.'),
('learn_new_skill','Practicar habilidad nueva','Practicar una habilidad nueva 30 min.','productivity',25,'🎓','Foto practicando la habilidad.'),
('goal_review','Revisar objetivos','Revisar progreso hacia los objetivos.','productivity',15,'🎯','Foto del cuaderno con la revisión.'),

-- ===== SOCIAL (10) =====
('call_family','Llamar a un familiar','Llamada con un familiar.','social',15,'📞','Captura del registro de llamada.'),
('coffee_with_friend','Café con un amigo','Quedar con un amigo en persona.','social',25,'☕','Foto del café/encuentro.'),
('family_dinner','Cena familiar','Cenar con la familia.','social',20,'🍽️','Foto de la cena familiar.'),
('gift_someone','Regalar a alguien','Hacer un regalo a alguien.','social',30,'🎁','Foto del regalo.'),
('help_stranger','Ayudar a un desconocido','Ayudar a alguien que no conoces.','social',25,'🤝','Foto del momento (con permiso) o nota.'),
('attend_event','Asistir a un evento','Evento social, cultural o profesional.','social',30,'🎫','Foto del evento o entrada.'),
('volunteer_hour','Voluntariado 1h','Una hora de voluntariado.','social',40,'❤️','Foto de la actividad de voluntariado.'),
('reconnect_old_friend','Retomar contacto','Hablar con alguien con quien hace tiempo no hablabas.','social',20,'💬','Captura de la conversación.'),
('write_letter','Escribir una carta','Escribir una carta o nota de mano.','social',25,'✉️','Foto de la carta escrita.'),
('compliment_three_people','3 cumplidos','Dar 3 cumplidos sinceros hoy.','social',15,'😊','Foto/nota personal de los cumplidos dados.')
on conflict (slug) do nothing;
