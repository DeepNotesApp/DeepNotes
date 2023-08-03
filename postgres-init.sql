--
-- PostgreSQL database dump
--

-- Dumped from database version 15.3
-- Dumped by pg_dump version 15.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: nanoid(integer, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.nanoid(size integer DEFAULT 21, alphabet text DEFAULT '_-0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'::text) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
    idBuilder     text := '';
    i             int  := 0;
    bytes         bytea;
    alphabetIndex int;
    mask          int;
    step          int;
BEGIN
    mask := (2 << cast(floor(log(length(alphabet) - 1) / log(2)) as int)) - 1;
    step := cast(ceil(1.6 * mask * size / length(alphabet)) AS int);

    while true
        loop
            bytes := gen_random_bytes(size);
            while i < size
                loop
                    alphabetIndex := (get_byte(bytes, i) & mask) + 1;
                    if alphabetIndex <= length(alphabet) then
                        idBuilder := idBuilder || substr(alphabet, alphabetIndex, 1);
                        if length(idBuilder) = size then
                            return idBuilder;
                        end if;
                    end if;
                    i = i + 1;
                end loop;

            i := 0;
        end loop;
END
$$;


ALTER FUNCTION public.nanoid(size integer, alphabet text) OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: devices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.devices (
    id character(21) DEFAULT public.nanoid() NOT NULL,
    user_id character(21) NOT NULL,
    trusted boolean DEFAULT false NOT NULL,
    hash bytea NOT NULL
);


ALTER TABLE public.devices OWNER TO postgres;

--
-- Name: group_join_invitations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.group_join_invitations (
    group_id character(21) NOT NULL,
    user_id character(21) NOT NULL,
    inviter_id character(21) NOT NULL,
    role text NOT NULL,
    encrypted_access_keyring bytea,
    encrypted_internal_keyring bytea NOT NULL,
    encrypted_name bytea NOT NULL,
    creation_date timestamp with time zone DEFAULT now() NOT NULL,
    encrypted_name_for_user bytea
);


ALTER TABLE public.group_join_invitations OWNER TO postgres;

--
-- Name: group_join_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.group_join_requests (
    group_id character(21) NOT NULL,
    user_id character(21) NOT NULL,
    rejected boolean DEFAULT false NOT NULL,
    encrypted_name bytea NOT NULL,
    creation_date timestamp with time zone DEFAULT now() NOT NULL,
    encrypted_name_for_user bytea NOT NULL
);


ALTER TABLE public.group_join_requests OWNER TO postgres;

--
-- Name: group_members; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.group_members (
    user_id character(21) NOT NULL,
    group_id character(21) NOT NULL,
    encrypted_access_keyring bytea,
    role text NOT NULL,
    encrypted_internal_keyring bytea NOT NULL,
    last_activity_date timestamp with time zone DEFAULT now() NOT NULL,
    encrypted_name bytea
);


ALTER TABLE public.group_members OWNER TO postgres;

--
-- Name: groups; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.groups (
    id character(21) DEFAULT public.nanoid() NOT NULL,
    main_page_id character(21) NOT NULL,
    creation_date timestamp with time zone DEFAULT now() NOT NULL,
    user_id character(21),
    encrypted_name bytea NOT NULL,
    public_keyring bytea NOT NULL,
    encrypted_private_keyring bytea NOT NULL,
    access_keyring bytea,
    encrypted_content_keyring bytea NOT NULL,
    permanent_deletion_date timestamp with time zone,
    encrypted_rehashed_password_hash bytea
);


ALTER TABLE public.groups OWNER TO postgres;

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    type text NOT NULL,
    datetime timestamp with time zone DEFAULT now() NOT NULL,
    encrypted_content bytea NOT NULL,
    id bigint NOT NULL
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.notifications ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.notifications_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: page_links; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.page_links (
    target_page_id character(21) NOT NULL,
    source_page_id character(21) NOT NULL,
    last_activity_date timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.page_links OWNER TO postgres;

--
-- Name: page_snapshots; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.page_snapshots (
    page_id character(21) NOT NULL,
    creation_date timestamp with time zone DEFAULT now() NOT NULL,
    encrypted_data bytea NOT NULL,
    author_id character(21),
    type text NOT NULL,
    encrypted_symmetric_key bytea,
    id character(21) DEFAULT public.nanoid() NOT NULL
);


ALTER TABLE public.page_snapshots OWNER TO postgres;

--
-- Name: page_updates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.page_updates (
    page_id character(21) NOT NULL,
    index bigint NOT NULL,
    encrypted_data bytea NOT NULL
);


ALTER TABLE public.page_updates OWNER TO postgres;

--
-- Name: pages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pages (
    id character(21) DEFAULT public.nanoid() NOT NULL,
    creation_date timestamp with time zone DEFAULT now() NOT NULL,
    last_activity_date timestamp with time zone DEFAULT now() NOT NULL,
    group_id character(21) NOT NULL,
    encrypted_relative_title bytea NOT NULL,
    encrypted_symmetric_keyring bytea NOT NULL,
    free boolean,
    next_snapshot_update_index bigint DEFAULT 100 NOT NULL,
    next_snapshot_date timestamp with time zone DEFAULT (now() + '00:15:00'::interval) NOT NULL,
    next_key_rotation_date timestamp with time zone DEFAULT (now() + '7 days'::interval) NOT NULL,
    permanent_deletion_date timestamp with time zone,
    encrypted_absolute_title bytea NOT NULL
);


ALTER TABLE public.pages OWNER TO postgres;

--
-- Name: sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sessions (
    id character(21) DEFAULT public.nanoid() NOT NULL,
    user_id character(21) NOT NULL,
    creation_date timestamp with time zone DEFAULT now() NOT NULL,
    invalidated boolean DEFAULT false NOT NULL,
    device_id character(21) NOT NULL,
    last_refresh_date timestamp with time zone DEFAULT now() NOT NULL,
    expiration_date timestamp with time zone NOT NULL,
    encryption_key bytea NOT NULL,
    refresh_code character(21) NOT NULL
);


ALTER TABLE public.sessions OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id character(21) DEFAULT public.nanoid() NOT NULL,
    creation_date timestamp with time zone DEFAULT now() NOT NULL,
    starting_page_id character(21) NOT NULL,
    recent_page_ids character(21)[] DEFAULT '{}'::character(21)[] NOT NULL,
    personal_group_id character(21) NOT NULL,
    email_verified boolean DEFAULT false NOT NULL,
    public_keyring bytea NOT NULL,
    encrypted_private_keyring bytea NOT NULL,
    encrypted_symmetric_keyring bytea NOT NULL,
    encrypted_default_arrow bytea NOT NULL,
    encrypted_default_note bytea NOT NULL,
    two_factor_auth_enabled boolean DEFAULT false NOT NULL,
    email_verification_expiration_date timestamp with time zone,
    email_verification_code text,
    recent_group_ids character(21)[] DEFAULT '{}'::character(21)[] NOT NULL,
    last_notification_read bigint,
    customer_id text,
    plan text DEFAULT 'basic'::text NOT NULL,
    subscription_id text,
    encrypted_name bytea,
    num_free_pages integer DEFAULT 0 NOT NULL,
    encrypted_authenticator_secret bytea,
    encrypted_email bytea NOT NULL,
    encrypted_new_email bytea,
    encrypted_recovery_codes bytea,
    demo boolean,
    email_hash bytea NOT NULL,
    encrypted_rehashed_login_hash bytea NOT NULL
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users_notifications (
    user_id character(21) NOT NULL,
    encrypted_symmetric_key bytea NOT NULL,
    notification_id bigint NOT NULL
);


ALTER TABLE public.users_notifications OWNER TO postgres;

--
-- Name: users_pages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users_pages (
    user_id character(21) NOT NULL,
    page_id character(21) NOT NULL,
    last_parent_id character(21)
);


ALTER TABLE public.users_pages OWNER TO postgres;

--
-- Name: devices devices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.devices
    ADD CONSTRAINT devices_pkey PRIMARY KEY (id);


--
-- Name: group_join_invitations group_join_invitations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.group_join_invitations
    ADD CONSTRAINT group_join_invitations_pkey PRIMARY KEY (group_id, user_id);


--
-- Name: group_join_requests group_join_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.group_join_requests
    ADD CONSTRAINT group_join_requests_pkey PRIMARY KEY (group_id, user_id);


--
-- Name: groups groups_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_pkey PRIMARY KEY (id);


--
-- Name: group_members groups_users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.group_members
    ADD CONSTRAINT groups_users_pkey PRIMARY KEY (group_id, user_id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: page_links page_links_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.page_links
    ADD CONSTRAINT page_links_pkey PRIMARY KEY (source_page_id, target_page_id);


--
-- Name: page_snapshots page_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.page_snapshots
    ADD CONSTRAINT page_snapshots_pkey PRIMARY KEY (id);


--
-- Name: pages pages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pages
    ADD CONSTRAINT pages_pkey PRIMARY KEY (id);


--
-- Name: page_updates pages_updates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.page_updates
    ADD CONSTRAINT pages_updates_pkey PRIMARY KEY (page_id, index);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: users users_encrypted_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_encrypted_email_key UNIQUE (encrypted_email);


--
-- Name: users_notifications users_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users_notifications
    ADD CONSTRAINT users_notifications_pkey PRIMARY KEY (user_id, notification_id);


--
-- Name: users_pages users_pages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users_pages
    ADD CONSTRAINT users_pages_pkey PRIMARY KEY (user_id, page_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: group_join_invitations_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX group_join_invitations_user_id_idx ON public.group_join_invitations USING btree (user_id, creation_date DESC);


--
-- Name: group_join_requests_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX group_join_requests_user_id_idx ON public.group_join_requests USING btree (user_id, creation_date DESC);


--
-- Name: group_members_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX group_members_user_id_idx ON public.group_members USING btree (user_id, last_activity_date DESC);


--
-- Name: page_links_target_page_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX page_links_target_page_id_idx ON public.page_links USING btree (target_page_id, last_activity_date DESC);


--
-- Name: sessions_refresh_code_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX sessions_refresh_code_idx ON public.sessions USING btree (refresh_code);


--
-- Name: users_creation_date_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX users_creation_date_idx ON public.users USING btree (creation_date DESC);


--
-- Name: users_customer_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX users_customer_id_idx ON public.users USING btree (customer_id);


--
-- Name: users_email_hash_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX users_email_hash_idx ON public.users USING btree (email_hash);


--
-- Name: users_pages_page_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX users_pages_page_id_idx ON public.users_pages USING btree (page_id);


--
-- Name: devices devices_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.devices
    ADD CONSTRAINT devices_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE RESTRICT ON DELETE CASCADE;


--
-- Name: group_join_invitations group_join_invitations_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.group_join_invitations
    ADD CONSTRAINT group_join_invitations_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON UPDATE RESTRICT ON DELETE CASCADE NOT VALID;


--
-- Name: group_join_invitations group_join_invitations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.group_join_invitations
    ADD CONSTRAINT group_join_invitations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE RESTRICT ON DELETE CASCADE NOT VALID;


--
-- Name: group_join_requests group_join_requests_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.group_join_requests
    ADD CONSTRAINT group_join_requests_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON UPDATE RESTRICT ON DELETE CASCADE NOT VALID;


--
-- Name: group_join_requests group_join_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.group_join_requests
    ADD CONSTRAINT group_join_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE RESTRICT ON DELETE CASCADE NOT VALID;


--
-- Name: groups groups_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_owner_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE RESTRICT ON DELETE CASCADE NOT VALID;


--
-- Name: group_members groups_users_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.group_members
    ADD CONSTRAINT groups_users_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON UPDATE RESTRICT ON DELETE CASCADE NOT VALID;


--
-- Name: group_members groups_users_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.group_members
    ADD CONSTRAINT groups_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE RESTRICT ON DELETE CASCADE;


--
-- Name: page_links page_links_source_page_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.page_links
    ADD CONSTRAINT page_links_source_page_id_fkey FOREIGN KEY (source_page_id) REFERENCES public.pages(id) ON UPDATE RESTRICT ON DELETE CASCADE;


--
-- Name: page_links page_links_target_page_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.page_links
    ADD CONSTRAINT page_links_target_page_id_fkey FOREIGN KEY (target_page_id) REFERENCES public.pages(id) ON UPDATE RESTRICT ON DELETE CASCADE;


--
-- Name: page_snapshots page_snapshots_page_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.page_snapshots
    ADD CONSTRAINT page_snapshots_page_id_fkey FOREIGN KEY (page_id) REFERENCES public.pages(id) ON UPDATE RESTRICT ON DELETE CASCADE NOT VALID;


--
-- Name: pages pages_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pages
    ADD CONSTRAINT pages_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON UPDATE RESTRICT ON DELETE CASCADE;


--
-- Name: page_updates pages_updates_page_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.page_updates
    ADD CONSTRAINT pages_updates_page_id_fkey FOREIGN KEY (page_id) REFERENCES public.pages(id) ON UPDATE RESTRICT ON DELETE CASCADE NOT VALID;


--
-- Name: sessions sessions_device_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.devices(id) ON UPDATE RESTRICT ON DELETE CASCADE NOT VALID;


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE RESTRICT ON DELETE CASCADE NOT VALID;


--
-- Name: users_notifications users_notifications_notification_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users_notifications
    ADD CONSTRAINT users_notifications_notification_id_fkey FOREIGN KEY (notification_id) REFERENCES public.notifications(id) ON UPDATE RESTRICT ON DELETE CASCADE NOT VALID;


--
-- Name: users_notifications users_notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users_notifications
    ADD CONSTRAINT users_notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE RESTRICT ON DELETE CASCADE NOT VALID;


--
-- Name: users_pages users_pages_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users_pages
    ADD CONSTRAINT users_pages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE RESTRICT ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

