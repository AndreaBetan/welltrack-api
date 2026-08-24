// Catálogo de materiales prácticos que complementan las recomendaciones.
// Se almacenan enlaces y metadatos, no copias del contenido externo.
exports.up = (pgm) => {
  pgm.createTable('learning_resources', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    code: {
      type: 'varchar(100)',
      notNull: true,
      unique: true,
    },
    title: {
      type: 'varchar(255)',
      notNull: true,
    },
    description: {
      type: 'text',
    },
    resource_type: {
      type: 'varchar(30)',
      notNull: true,
    },
    provider: {
      type: 'varchar(150)',
      notNull: true,
    },
    resource_url: {
      type: 'text',
      notNull: true,
    },
    language: {
      type: 'varchar(10)',
      notNull: true,
      default: 'es',
    },
    access_mode: {
      type: 'varchar(30)',
      notNull: true,
      default: 'external_link',
    },
    license_name: {
      type: 'varchar(100)',
    },
    license_url: {
      type: 'text',
    },
    duration_minutes: {
      type: 'integer',
    },
    difficulty: {
      type: 'varchar(20)',
    },
    safety_note: {
      type: 'text',
    },
    is_active: {
      type: 'boolean',
      notNull: true,
      default: true,
    },
    last_verified_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    updated_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  pgm.addConstraint(
    'learning_resources',
    'learning_resources_type_check',
    {
      check: "resource_type IN ('article', 'video', 'audio', 'guide', 'exercise')",
    }
  );

  pgm.addConstraint(
    'learning_resources',
    'learning_resources_access_mode_check',
    {
      check: "access_mode IN ('external_link', 'embedded')",
    }
  );

  pgm.addConstraint(
    'learning_resources',
    'learning_resources_difficulty_check',
    {
      check: `
        difficulty IS NULL
        OR difficulty IN ('beginner', 'intermediate', 'advanced')
      `,
    }
  );

  pgm.addConstraint(
    'learning_resources',
    'learning_resources_duration_check',
    {
      check: 'duration_minutes IS NULL OR duration_minutes > 0',
    }
  );

  pgm.sql(`
    INSERT INTO learning_resources (
      code,
      title,
      description,
      resource_type,
      provider,
      resource_url,
      language,
      access_mode,
      license_name,
      license_url,
      difficulty,
      safety_note
    )
    VALUES
      (
        'WHO_STRESS_GUIDE',
        'En tiempos de estrés, haz lo que importa',
        'Guía ilustrada con técnicas prácticas y ejercicios de audio para afrontar el estrés.',
        'guide',
        'Organización Mundial de la Salud',
        'https://www.who.int/publications/i/item/9789240003927',
        'es',
        'external_link',
        'CC BY-NC-SA 3.0 IGO',
        'https://creativecommons.org/licenses/by-nc-sa/3.0/igo/',
        NULL,
        'Este material es educativo y no sustituye la atención de un profesional sanitario.'
      ),
      (
        'NHS_BETTER_SLEEP',
        'Cómo mejorar el sueño',
        'Consejos sobre rutina, entorno de descanso, cafeína y uso de pantallas.',
        'article',
        'NHS',
        'https://www.nhs.uk/every-mind-matters/mental-health-issues/sleep/',
        'en',
        'external_link',
        NULL,
        NULL,
        NULL,
        'Si los problemas de sueño persisten o afectan tu vida diaria, consulta con un profesional sanitario.'
      ),
      (
        'NHS_FITNESS_STUDIO',
        'Fitness Studio: ejercicios, pilates y yoga',
        'Colección de vídeos dirigidos por instructores sobre ejercicio aeróbico, fuerza, pilates y yoga.',
        'video',
        'NHS',
        'https://www.nhs.uk/live-well/exercise/about-our-videos/',
        'en',
        'external_link',
        NULL,
        NULL,
        'beginner',
        'Adapta la actividad a tus posibilidades y detente si sientes dolor, mareo o malestar.'
      ),
      (
        'AESAN_HEALTHY_HABITS',
        'Recomendaciones dietéticas y de actividad física',
        'Materiales oficiales sobre alimentación saludable, sostenibilidad y actividad física para la población española.',
        'guide',
        'AESAN',
        'https://www.aesan.gob.es/va/nutricion/recomendaciones-dieteticas',
        'es',
        'external_link',
        NULL,
        NULL,
        NULL,
        'Las necesidades nutricionales pueden variar según las características y circunstancias personales.'
      ),
      (
        'WHO_HEALTHY_DIET',
        'Alimentación saludable',
        'Principios de adecuación, equilibrio, moderación y diversidad para una alimentación saludable.',
        'article',
        'Organización Mundial de la Salud',
        'https://www.who.int/es/news-room/fact-sheets/detail/healthy-diet',
        'es',
        'external_link',
        NULL,
        NULL,
        NULL,
        'La información es general y no sustituye una valoración nutricional individual.'
      ),
      (
        'WHO_PHYSICAL_ACTIVITY',
        'Directrices sobre actividad física y hábitos sedentarios',
        'Recomendaciones basadas en evidencia sobre actividad física para diferentes grupos de población.',
        'guide',
        'Organización Mundial de la Salud',
        'https://www.who.int/publications/i/item/9789240015128',
        'es',
        'external_link',
        NULL,
        NULL,
        NULL,
        'Adapta la actividad a tu condición física y consulta con un profesional si tienes limitaciones de salud.'
      );
  `);
};

exports.down = (pgm) => {
  pgm.dropTable('learning_resources');
};
