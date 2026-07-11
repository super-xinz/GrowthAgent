from logging.config import fileConfig
from alembic import context
from sqlalchemy import pool
from sqlalchemy.ext.asyncio import async_engine_from_config
from app.models import Base

config = context.config
if config.config_file_name:
    fileConfig(config.config_file_name)
target_metadata = Base.metadata


def offline():
    context.configure(
        url=config.get_main_option("sqlalchemy.url"),
        target_metadata=target_metadata,
        literal_binds=True,
    )
    with context.begin_transaction():
        context.run_migrations()


async def online_run():
    engine = async_engine_from_config(
        config.get_section(config.config_ini_section), prefix="sqlalchemy.", poolclass=pool.NullPool
    )
    async with engine.connect() as connection:
        await connection.run_sync(
            lambda c: context.configure(
                connection=c, target_metadata=target_metadata, compare_type=True
            )
        )
        await connection.run_sync(lambda _: context.run_migrations())
    await engine.dispose()


def online():
    import asyncio

    asyncio.run(online_run())


offline() if context.is_offline_mode() else online()
