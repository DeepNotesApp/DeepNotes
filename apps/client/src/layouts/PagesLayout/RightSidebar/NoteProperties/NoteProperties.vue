<template>
  <q-list v-if="!uiStore().rightSidebarExpanded">
    <MiniSidebarBtn
      tooltip="Create new page"
      icon="mdi-note-plus"
      :disable="page.react.readOnly"
      @click="showNewPageDialog()"
    >
      <TutorialTooltip
        v-if="
          internals.pages.react.isNewUser &&
          internals.pages.react.tutorialStep === 4
        "
        pos="left"
      >
        <div v-html="newPageTooltipHTML"></div>
      </TutorialTooltip>
    </MiniSidebarBtn>

    <q-separator />

    <MiniSidebarBtn
      tooltip="Head"
      icon="mdi-page-layout-header"
      :disable="page.react.readOnly"
      :active="note.react.collab.head.enabled"
      @click="
        changeProp(!note.react.collab.head.enabled, (selectedNote, value) => {
          selectedNote.react.collab.body.enabled ||=
            selectedNote.react.numEnabledSections === 1 && !value;
          selectedNote.react.collab.head.enabled = value;
        })
      "
    />

    <MiniSidebarBtn
      tooltip="Swap head and body"
      icon="mdi-cached"
      :disable="page.react.readOnly"
      @click="
        changeProp(null, (note) => {
          internals
            .tiptap()
            .swapXmlFragments(
              note.react.collab.head.value,
              note.react.collab.body.value,
            );
        })
      "
    />

    <MiniSidebarBtn
      tooltip="Body"
      icon="mdi-page-layout-body"
      :disable="page.react.readOnly"
      :active="note.react.collab.body.enabled"
      @click="
        () => {
          changeProp(!note.react.collab.body.enabled, (selectedNote, value) => {
            selectedNote.react.collab.head.enabled ||=
              selectedNote.react.numEnabledSections === 1 && !value;
            selectedNote.react.collab.body.enabled = value;
          });

          if (internals.pages.react.tutorialStep === 1) {
            internals.pages.react.tutorialStep++;
          }
        }
      "
    >
      <TutorialTooltip
        v-if="
          internals.pages.react.isNewUser &&
          internals.pages.react.tutorialStep === 1
        "
        pos="left"
      >
        <div v-html="bodyTooltipHTML"></div>
      </TutorialTooltip>
    </MiniSidebarBtn>

    <q-separator />

    <MiniSidebarBtn
      tooltip="Collapsible"
      icon="mdi-minus-box"
      :disable="page.react.readOnly"
      :active="note.react.collab.collapsing.enabled"
      @click="
        () => {
          changeProp(
            !note.react.collab.collapsing.enabled,
            (selectedNote, value) => {
              selectedNote.react.collab.collapsing.enabled = value;
            },
          );

          if (internals.pages.react.tutorialStep === 2) {
            internals.pages.react.tutorialStep++;
          }
        }
      "
    >
      <TutorialTooltip
        v-if="
          internals.pages.react.isNewUser &&
          internals.pages.react.tutorialStep === 2
        "
        pos="left"
      >
        <div v-html="collapsibleTooltipHTML"></div>
      </TutorialTooltip>
    </MiniSidebarBtn>

    <MiniSidebarBtn
      :tooltip="note.react.collapsing.collapsed ? 'Collapsed' : 'Expanded'"
      :icon="
        note.react.collapsing.collapsed
          ? 'mdi-chevron-up-box-outline'
          : 'mdi-chevron-down-box-outline'
      "
      :active="note.react.collapsing.collapsed"
      :disable="page.react.readOnly && !note.react.collab.collapsing.enabled"
      @click="
        changeProp(!note.react.collapsing.collapsed, (selectedNote, value) => {
          if (!page.react.readOnly) {
            selectedNote.react.collab.collapsing.enabled = true;
          }

          selectedNote.react.collapsing.collapsed = value;
        })
      "
    />

    <q-separator />

    <MiniSidebarBtn
      tooltip="Container"
      icon="mdi-page-layout-footer"
      :disable="page.react.readOnly"
      :active="note.react.collab.container.enabled"
      @click="
        () => {
          changeProp(
            !note.react.collab.container.enabled,
            (selectedNote, value) => {
              selectedNote.react.collab.body.enabled ||=
                selectedNote.react.numEnabledSections === 1 && !value;
              selectedNote.react.collab.container.enabled = value;
              selectedNote.react.collab.container.spatial = false;
            },
          );

          if (internals.pages.react.tutorialStep === 3) {
            internals.pages.react.tutorialStep++;
          }
        }
      "
    >
      <TutorialTooltip
        v-if="
          internals.pages.react.isNewUser &&
          internals.pages.react.tutorialStep === 3
        "
        pos="left"
      >
        <div v-html="containerTooltipHTML"></div>
      </TutorialTooltip>
    </MiniSidebarBtn>

    <MiniSidebarBtn
      tooltip="Spatial"
      icon="mdi-axis-arrow"
      :disable="page.react.readOnly"
      :active="
        note.react.collab.container.enabled &&
        note.react.collab.container.spatial
      "
      @click="
        changeProp(
          !(
            note.react.collab.container.enabled &&
            note.react.collab.container.spatial
          ),
          (selectedNote, value) => {
            selectedNote.react.collab.container.enabled = true;
            selectedNote.react.collab.container.spatial = value;
          },
        )
      "
    />

    <q-separator />

    <ColorPalette
      type="notes"
      orientation="vertical"
      :split="2"
      style="margin: 6px; width: 44px"
      :disable="page.react.readOnly"
      @select="
        changeProp($event, (selectedNote, value) => {
          if (selectedNote.react.region.type === 'note') {
            selectedNote.react.collab.color.inherit = false;
          }

          selectedNote.react.collab.color.value = value;
        })
      "
    />
  </q-list>

  <div v-else>
    <!-- Link -->

    <div style="padding: 20px; display: flex; flex-direction: column">
      <LinkURL
        :model-value="note.react.collab.link"
        @update:model-value="
          (event) => {
            changeProp(event, (selectedNote, value) => {
              selectedNote.react.collab.link = value;
            });

            void createPageBacklink({
              sourcePageId: page.id,
              targetUrl: event,
            });
          }
        "
      />

      <Gap style="height: 16px" />

      <DeepBtnDropdown
        label="Create new page"
        icon="mdi-note-plus"
        class="new-page-button"
        color="primary"
        split
        :menu-offset="[0, 2]"
        :disable="page.react.readOnly"
        @click="createNewPageQuick()"
      >
        <q-list class="bg-primary">
          <q-item
            clickable
            v-close-popup
            @click="showNewPageDialog()"
          >
            <q-item-section avatar>
              <q-icon name="mdi-note-plus" />
            </q-item-section>

            <q-item-section>
              <q-item-label>Create with options</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>

        <template #label>
          <TutorialTooltip
            v-if="
              internals.pages.react.isNewUser &&
              internals.pages.react.tutorialStep === 4
            "
            ref="newPageTooltip"
            pos="bottom"
          >
            <div v-html="newPageTooltipHTML"></div>
          </TutorialTooltip>
        </template>
      </DeepBtnDropdown>
    </div>

    <q-separator />

    <!-- Head and body -->

    <div style="padding: 20px; display: flex; flex-direction: column">
      <div style="display: flex">
        <Checkbox
          label="Head"
          :disable="page.react.readOnly"
          :model-value="note.react.collab.head.enabled"
          title="Toggle head section"
          @update:model-value="
            changeProp($event, (selectedNote, value) => {
              selectedNote.react.collab.body.enabled ||=
                selectedNote.react.numEnabledSections === 1 && !value;
              selectedNote.react.collab.head.enabled = value;
            })
          "
        />

        <Gap style="width: 16px" />

        <Checkbox
          label="Body"
          :disable="page.react.readOnly"
          :model-value="note.react.collab.body.enabled"
          title="Toggle body section"
          @update:model-value="
            (event) => {
              changeProp(event, (selectedNote, value) => {
                selectedNote.react.collab.head.enabled ||=
                  selectedNote.react.numEnabledSections === 1 && !value;
                selectedNote.react.collab.body.enabled = value;
              });

              if (internals.pages.react.tutorialStep === 1) {
                internals.pages.react.tutorialStep++;
              }
            }
          "
        >
          <TutorialTooltip
            v-if="
              internals.pages.react.isNewUser &&
              internals.pages.react.tutorialStep === 1
            "
            ref="bodyTooltip"
            pos="bottom"
          >
            <div v-html="bodyTooltipHTML"></div>
          </TutorialTooltip>
        </Checkbox>
      </div>

      <Gap style="height: 16px" />

      <div style="display: flex">
        <DeepBtn
          label="Swap head and body"
          icon="mdi-cached"
          color="primary"
          :disable="page.react.readOnly"
          dense
          style="flex: 1"
          @click="
            changeProp(null, (note) => {
              internals
                .tiptap()
                .swapXmlFragments(
                  note.react.collab.head.value,
                  note.react.collab.body.value,
                );
            })
          "
        />
      </div>
    </div>

    <template
      v-if="
        page.collab.store.notes[note.id]?.createdAt != null ||
        page.collab.store.notes[note.id]?.editedAt != null ||
        page.collab.store.notes[note.id]?.movedAt != null
      "
    >
      <q-separator />

      <div style="padding: 16px 20px; display: flex; flex-direction: column">
        <div v-if="page.collab.store.notes[note.id]?.createdAt != null">
          <b>Created at: </b>
          <span style="font-size: 13px">
            {{
              new Intl.DateTimeFormat('en', {
                dateStyle: 'medium',
                timeStyle: 'short',
              }).format(page.collab.store.notes[note.id].createdAt!)
            }}
          </span>
        </div>

        <div v-if="page.collab.store.notes[note.id]?.editedAt != null">
          <b>Edited at: </b>
          <span style="font-size: 13px">
            {{
              new Intl.DateTimeFormat('en', {
                dateStyle: 'medium',
                timeStyle: 'short',
              }).format(page.collab.store.notes[note.id].editedAt!)
            }}
          </span>
        </div>

        <div
          v-if="page.collab.store.notes[note.id]?.movedAt != null"
          title="The last time this note was moved between containers"
        >
          <b>Moved at: </b>
          <span style="font-size: 13px">
            {{
              new Intl.DateTimeFormat('en', {
                dateStyle: 'medium',
                timeStyle: 'short',
              }).format(page.collab.store.notes[note.id].movedAt!)
            }}
          </span>
        </div>
      </div>
    </template>

    <q-separator />

    <div style="padding: 20px; display: flex; flex-direction: column">
      <DeepBtn
        label="Copy link to this note"
        icon="mdi-content-copy"
        color="primary"
        @click="
          async () => {
            await setClipboardText(
              `https://deepnotes.app/pages/${page.id}?elem=${note.id}`,
            );

            $q.notify({
              message: 'Copied to clipboard.',
              type: 'positive',
            });
          }
        "
      />

      <Gap style="height: 16px" />

      <DeepBtn
        label="Set as default note style"
        icon="mdi-content-save"
        color="primary"
        title="Set this note as the default note"
        @click="setAsDefault()"
        :disable="page.react.readOnly"
      />
    </div>

    <q-separator />

    <!-- Anchor -->

    <div style="padding: 20px; display: flex; flex-direction: column">
      <div class="display: flex">
        <div style="flex: 1">
          <TextField
            label="X position"
            :model-value="note.react.collab.pos.x"
            @update:model-value="
              changeProp(parseFloat($event as any), (selectedNote, value) => {
                selectedNote.react.collab.pos.x = isNaN(value) ? 0 : value;
              })
            "
            dense
            :disable="page.react.readOnly"
            :maxlength="25"
          />
        </div>

        <Gap style="width: 16px" />

        <div style="flex: 1">
          <TextField
            label="Y position"
            :model-value="note.react.collab.pos.y"
            @update:model-value="
              changeProp(parseFloat($event as any), (selectedNote, value) => {
                selectedNote.react.collab.pos.y = isNaN(value) ? 0 : value;
              })
            "
            dense
            :disable="page.react.readOnly"
            :maxlength="25"
          />
        </div>
      </div>

      <Gap style="height: 16px" />

      <div class="display: flex">
        <div style="flex: 1">
          <q-select
            label="X anchor"
            :disable="page.react.readOnly"
            :model-value="note.react.collab.anchor.x"
            @update:model-value="
              changeProp($event, (selectedNote, value) => {
                selectedNote.react.collab.pos.x +=
                  (value - selectedNote.react.collab.anchor.x) *
                  selectedNote.react.size.x;
                selectedNote.react.collab.anchor.x = value;
              })
            "
            :options="[
              { label: 'Left', value: 0 },
              { label: 'Center', value: 0.5 },
              { label: 'Right', value: 1 },
            ]"
            filled
            dense
            emit-value
            map-options
          />
        </div>

        <Gap style="width: 16px" />

        <div style="flex: 1">
          <q-select
            label="Y anchor"
            :disable="page.react.readOnly"
            :model-value="note.react.collab.anchor.y"
            @update:model-value="
              changeProp($event, (selectedNote, value) => {
                selectedNote.react.collab.pos.y +=
                  (value - selectedNote.react.collab.anchor.y) *
                  selectedNote.react.size.y;
                selectedNote.react.collab.anchor.y = value;
              })
            "
            :options="[
              { label: 'Top', value: 0 },
              { label: 'Center', value: 0.5 },
              { label: 'Bottom', value: 1 },
            ]"
            filled
            dense
            emit-value
            map-options
          />
        </div>
      </div>
    </div>

    <q-separator />

    <div style="padding: 20px; display: flex; flex-direction: column">
      <div style="display: flex">
        <Combobox
          label="Width"
          :disable="page.react.readOnly"
          :options="[
            { label: 'Auto', value: 'Auto' },
            ...(note.react.collapsing.collapsed
              ? [{ label: 'Minimum', value: 'Minimum' }]
              : []),
          ]"
          :model-value="note.react.collab.width[note.react.sizeProp]"
          @update:model-value="
            changeProp($event, (selectedNote, value) => {
              selectedNote.react.collab.width[note.react.sizeProp] = value;
            })
          "
          style="flex: 1; min-width: 0"
        />

        <Gap style="width: 16px" />

        <Combobox
          label="Head height"
          :disable="page.react.readOnly"
          :options="[{ label: 'Auto', value: 'Auto' }]"
          :model-value="note.react.collab.head.height[note.react.sizeProp]"
          @update:model-value="
            changeProp($event, (selectedNote, value) => {
              selectedNote.react.collab.head.height[note.react.sizeProp] =
                value;
            })
          "
          style="flex: 1; min-width: 0"
        />
      </div>

      <Gap style="height: 16px" />

      <div style="display: flex">
        <Combobox
          label="Body height"
          :disable="page.react.readOnly"
          :options="[{ label: 'Auto', value: 'Auto' }]"
          :model-value="note.react.collab.body.height[note.react.sizeProp]"
          @update:model-value="
            changeProp($event, (selectedNote, value) => {
              selectedNote.react.collab.body.height[note.react.sizeProp] =
                value;
            })
          "
          style="flex: 1; min-width: 0"
        />

        <Gap style="width: 16px" />

        <Combobox
          label="Container height"
          :disable="page.react.readOnly"
          :options="[{ label: 'Auto', value: 'Auto' }]"
          :model-value="note.react.collab.container.height[note.react.sizeProp]"
          @update:model-value="
            changeProp($event, (selectedNote, value) => {
              selectedNote.react.collab.container.height[note.react.sizeProp] =
                value;
            })
          "
          style="flex: 1; min-width: 0"
        />
      </div>
    </div>

    <q-separator />

    <div style="padding: 20px">
      <Checkbox
        label="Inherit color from parent"
        :disable="page.react.readOnly"
        :model-value="note.react.collab.color.inherit"
        @update:model-value="
          changeProp($event, (selectedNote, value) => {
            selectedNote.react.collab.color.inherit = value;
          })
        "
      />

      <Gap style="height: 16px" />

      <div style="display: flex; justify-content: center">
        <ColorPalette
          type="notes"
          orientation="horizontal"
          :split="2"
          :disable="page.react.readOnly"
          style="width: 160px"
          @select="
            changeProp($event, (selectedNote, value) => {
              if (selectedNote.react.region.type === 'note') {
                selectedNote.react.collab.color.inherit = false;
              }

              selectedNote.react.collab.color.value = value;
            })
          "
        />
      </div>
    </div>

    <q-separator />

    <!-- Collapsing -->

    <div style="padding: 20px; display: flex; flex-direction: column">
      <div style="display: flex">
        <Checkbox
          label="Collapsible"
          class="collapsible-checkbox"
          :disable="page.react.readOnly"
          :model-value="note.react.collab.collapsing.enabled"
          @update:model-value="
            (event) => {
              changeProp(event, (selectedNote, value) => {
                selectedNote.react.collab.collapsing.enabled = value;
              });

              if (internals.pages.react.tutorialStep === 2) {
                internals.pages.react.tutorialStep++;
              }
            }
          "
        >
          <TutorialTooltip
            v-if="
              internals.pages.react.isNewUser &&
              internals.pages.react.tutorialStep === 2
            "
            ref="collapsibleTooltip"
            pos="bottom"
          >
            <div v-html="collapsibleTooltipHTML"></div>
          </TutorialTooltip>
        </Checkbox>

        <Gap style="width: 16px" />

        <Checkbox
          label="Collapsed"
          :model-value="note.react.collab.collapsing.collapsed"
          @update:model-value="
            changeProp($event, (selectedNote, value) => {
              selectedNote.react.collab.collapsing.collapsed = value;
            })
          "
          :disable="
            page.react.readOnly || !note.react.collab.collapsing.enabled
          "
        />
      </div>

      <Gap style="height: 16px" />

      <div style="display: flex">
        <Checkbox
          label="Local collapsing"
          :model-value="note.react.collab.collapsing.localCollapsing"
          @update:model-value="
            changeProp($event, (selectedNote, value) => {
              selectedNote.react.collab.collapsing.localCollapsing = value;
            })
          "
          :disable="
            page.react.readOnly || !note.react.collab.collapsing.enabled
          "
        />

        <Gap style="width: 16px" />

        <Checkbox
          label="Locally collapsed"
          :model-value="note.react.collapsing.locallyCollapsed"
          @update:model-value="
            changeProp($event, (selectedNote, value) => {
              selectedNote.react.collapsing.locallyCollapsed = value;
            })
          "
          :disable="
            page.react.readOnly ||
            !note.react.collab.collapsing.enabled ||
            !note.react.collab.collapsing.localCollapsing
          "
        />
      </div>
    </div>

    <q-separator />

    <!-- Container -->

    <div style="padding: 20px; display: flex; flex-direction: column">
      <div style="display: flex">
        <Checkbox
          label="Container"
          class="container-checkbox"
          :disable="page.react.readOnly"
          :model-value="note.react.collab.container.enabled"
          @update:model-value="
            (event) => {
              changeProp(event, (selectedNote, value) => {
                selectedNote.react.collab.body.enabled ||=
                  selectedNote.react.numEnabledSections === 1 && !value;
                selectedNote.react.collab.container.enabled = value;
              });

              if (internals.pages.react.tutorialStep === 3) {
                internals.pages.react.tutorialStep++;
              }
            }
          "
        >
          <TutorialTooltip
            v-if="
              internals.pages.react.isNewUser &&
              internals.pages.react.tutorialStep === 3
            "
            ref="containerTooltip"
            pos="bottom"
          >
            <div v-html="containerTooltipHTML"></div>
          </TutorialTooltip>
        </Checkbox>

        <Gap style="width: 16px" />

        <Checkbox
          label="Spatial"
          :model-value="note.react.collab.container.spatial"
          @update:model-value="
            changeProp($event, (selectedNote, value) => {
              selectedNote.react.collab.container.spatial = value;
            })
          "
          :disable="page.react.readOnly || !note.react.collab.container.enabled"
        />
      </div>

      <Gap style="height: 16px" />

      <div style="display: flex">
        <Checkbox
          label="Horizontal"
          :model-value="note.react.collab.container.horizontal"
          @update:model-value="
            changeProp($event, (selectedNote, value) => {
              selectedNote.react.collab.container.horizontal = value;
            })
          "
          :disable="
            page.react.readOnly ||
            !note.react.collab.container.enabled ||
            note.react.collab.container.spatial
          "
        />

        <Gap style="width: 16px" />

        <Checkbox
          label="Stretch children"
          :model-value="note.react.collab.container.stretchChildren"
          @update:model-value="
            changeProp($event, (selectedNote, value) => {
              selectedNote.react.collab.container.stretchChildren = value;
            })
          "
          :disable="
            page.react.readOnly ||
            !note.react.collab.container.enabled ||
            note.react.collab.container.horizontal ||
            note.react.collab.container.spatial
          "
        />
      </div>

      <Gap style="height: 16px" />

      <Checkbox
        label="Wrap children"
        :model-value="note.react.collab.container.wrapChildren"
        @update:model-value="
          changeProp($event, (selectedNote, value) => {
            selectedNote.react.collab.container.wrapChildren = value;
          })
        "
        :disable="
          page.react.readOnly ||
          !note.react.collab.container.enabled ||
          note.react.collab.container.spatial
        "
      />

      <Gap style="height: 16px" />

      <Checkbox
        label="Force color inheritance"
        :model-value="note.react.collab.container.forceColorInheritance"
        @update:model-value="
          changeProp($event, (selectedNote, value) => {
            selectedNote.react.collab.container.forceColorInheritance = value;
          })
        "
        :disable="page.react.readOnly || !note.react.collab.container.enabled"
      />

      <Gap style="height: 24px" />

      <DeepBtn
        label="Reverse children"
        icon="mdi-swap-vertical"
        :disable="
          page.react.readOnly ||
          note.react.collab.container.spatial ||
          note.react.notes.length < 2
        "
        color="primary"
        @click="
          changeProp($event, (selectedNote, value) => {
            selectedNote.reverseChildren();
          })
        "
      />

      <Gap style="height: 16px" />

      <input
        ref="fileInput"
        style="display: none"
        type="file"
        accept=".txt, .md"
        multiple
        @change="onFileChange"
      />

      <DeepBtn
        label="Import children from files"
        icon="mdi-import"
        :disable="
          page.react.readOnly ||
          (note.react.collab.container.enabled && note.react.container.spatial)
        "
        color="primary"
        @click="importChildrenFromFiles"
      />
    </div>

    <q-separator />

    <div style="padding: 20px; display: flex">
      <Checkbox
        label="Movable"
        :disable="page.react.readOnly"
        :model-value="note.react.collab.movable"
        @update:model-value="
          changeProp($event, (selectedNote, value) => {
            selectedNote.react.collab.movable = value;
          })
        "
      />

      <Gap style="width: 16px" />

      <Checkbox
        label="Resizable"
        :disable="page.react.readOnly"
        :model-value="note.react.collab.resizable"
        @update:model-value="
          changeProp($event, (selectedNote, value) => {
            selectedNote.react.collab.resizable = value;
          })
        "
      />
    </div>

    <q-separator />

    <div style="padding: 20px; display: flex">
      <Checkbox
        label="Wrap head"
        :disable="page.react.readOnly"
        :model-value="note.react.collab.head.wrap"
        @update:model-value="
          changeProp($event, (selectedNote, value) => {
            selectedNote.react.collab.head.wrap = value;
          })
        "
      />

      <Gap style="width: 16px" />

      <Checkbox
        label="Wrap body"
        :disable="page.react.readOnly"
        :model-value="note.react.collab.body.wrap"
        @update:model-value="
          changeProp($event, (selectedNote, value) => {
            selectedNote.react.collab.body.wrap = value;
          })
        "
      />
    </div>

    <q-separator />

    <div style="padding: 20px; display: flex">
      <Checkbox
        label="Read-only"
        :disable="page.react.readOnly"
        :model-value="note.react.collab.readOnly"
        @update:model-value="
          changeProp($event, (selectedNote, value) => {
            selectedNote.react.collab.readOnly = value;
          })
        "
      />

      <Gap style="width: 16px" />

      <div style="flex: 1"></div>
    </div>

    <q-separator />

    <div style="padding: 20px; display: flex; flex-direction: column">
      <DeepBtn
        label="Export"
        icon="mdi-export"
        color="primary"
      >
        <q-menu
          anchor="top middle"
          self="bottom middle"
          :offset="[0, 2]"
          style="width: 244px"
          auto-close
        >
          <q-list class="bg-primary">
            <q-item
              clickable
              @click="copyAsMarkdown({ includeDescendants: false })"
            >
              <q-item-section avatar>
                <q-icon name="mdi-content-copy" />
              </q-item-section>

              <q-item-section>
                <q-item-label>Copy as markdown</q-item-label>
              </q-item-section>
            </q-item>

            <q-item
              v-if="note.react.notes.length > 0"
              clickable
              @click="copyAsMarkdown({ includeDescendants: true })"
            >
              <q-item-section avatar>
                <q-icon name="mdi-content-copy" />
              </q-item-section>

              <q-item-section>
                <q-item-label>
                  Copy as markdown (include descendants)
                </q-item-label>
              </q-item-section>
            </q-item>

            <q-item
              clickable
              @click="downloadAsMarkdown({ includeDescendants: false })"
            >
              <q-item-section avatar>
                <q-icon name="mdi-download" />
              </q-item-section>

              <q-item-section>
                <q-item-label>Download as markdown</q-item-label>
              </q-item-section>
            </q-item>

            <q-item
              v-if="note.react.notes.length > 0"
              clickable
              @click="downloadAsMarkdown({ includeDescendants: true })"
            >
              <q-item-section avatar>
                <q-icon name="mdi-download" />
              </q-item-section>

              <q-item-section>
                <q-item-label>
                  Download as markdown (include descendants)
                </q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-menu>
      </DeepBtn>
    </div>
  </div>
</template>

<script setup lang="ts">
import { splitStr } from '@stdlib/misc';
import type { Editor } from '@tiptap/vue-3';
import { useIntervalFn } from '@vueuse/core';
import { saveAs } from 'file-saver';
import { pack } from 'msgpackr';
import { QMenu } from 'quasar';
import showdown from 'showdown';
import { createPageBacklink } from 'src/code/api-interface/pages/backlinks/create';
import { createPage } from 'src/code/api-interface/pages/create';
import type { PageNote } from 'src/code/pages/page/notes/note';
import type { Page } from 'src/code/pages/page/page';
import { setClipboardText } from 'src/code/utils/clipboard';
import { handleError } from 'src/code/utils/misc';
import TutorialTooltip from 'src/components/TutorialTooltip.vue';
import TurndownService from 'turndown';
import type { Ref } from 'vue';

import NewPageDialog from './NewPageDialog.vue';

const page = inject<Ref<Page>>('page')!;

const note = computed(() => page.value.activeElem.react.value as PageNote);

const newPageTooltipHTML =
  'Click here to create<br/>a <b>new page</b> through<br/>this note.<br/>';
const bodyTooltipHTML = 'Click here to<br/>enable the <b>note body</b>.';
const collapsibleTooltipHTML =
  'Click here to make<br/>the note <b>collapsible</b>.';
const containerTooltipHTML =
  'Click here to enable<br/> the <b>note container</b>.<br/>This allows to place<br/>notes within eachother.';

const newPageTooltip = ref<InstanceType<typeof TutorialTooltip>>();
const bodyTooltip = ref<InstanceType<typeof TutorialTooltip>>();
const collapsibleTooltip = ref<InstanceType<typeof TutorialTooltip>>();
const containerTooltip = ref<InstanceType<typeof TutorialTooltip>>();

useIntervalFn(() => {
  if (internals.pages.react.isNewUser) {
    newPageTooltip.value?.updatePosition();
    bodyTooltip.value?.updatePosition();
    collapsibleTooltip.value?.updatePosition();
    containerTooltip.value?.updatePosition();
  }
}, 1);

const fileInput = ref<HTMLInputElement>();

function changeProp(value: any, func: (note: PageNote, value: any) => void) {
  page.value.collab.doc.transact(() => {
    for (const selectedNote of page.value.selection.react.notes) {
      func(selectedNote, value);
    }
  });
}

function getInitialPageTitle() {
  let initialPageTitle = splitStr(getSelection()?.toString() ?? '', '\n')[0];

  if (initialPageTitle === '') {
    const activeElem = internals.pages.react.page.activeElem.react.value;

    if (activeElem?.type !== 'note') {
      return '';
    }

    const editorElems = activeElem.getElems('ProseMirror');

    for (const editorElem of editorElems) {
      initialPageTitle = splitStr(editorElem.innerText, '\n')[0];

      if (initialPageTitle !== '') {
        break;
      }
    }
  }

  return initialPageTitle;
}

async function createNewPageQuick() {
  const initialPageTitle = getInitialPageTitle();

  if (initialPageTitle === '') {
    $quasar().notify({
      html: true,
      message:
        'Cannot create a page from an empty note.<br/>Please write something in it first.',
      color: 'negative',
    });
    return;
  }

  const response = await createPage({
    parentPageId: page.value.id,
    destGroupId: page.value.react.groupId,

    pageRelativeTitle: initialPageTitle,
  });

  changeProp(`/pages/${response.pageId}`, (selectedNote, url) => {
    selectedNote.react.collab.link = url;
  });

  await internals.pages.goToPage(response.pageId, { fromParent: true });

  $quasar().notify({
    message:
      'Page created successfully.' +
      (response.numFreePages != null
        ? ` (${response.numFreePages + 1}/50)`
        : ''),
    type: 'positive',
  });

  if (internals.pages.react.tutorialStep === 4) {
    internals.pages.react.tutorialStep++;
  }
}

function showNewPageDialog() {
  $quasar()
    .dialog({
      component: NewPageDialog,

      componentProps: {
        initialPageTitle: getInitialPageTitle(),
      },
    })
    .onOk((url) => {
      changeProp(url, (selectedNote, url) => {
        selectedNote.react.collab.link = url;
      });

      if (internals.pages.react.tutorialStep === 4) {
        internals.pages.react.tutorialStep++;
      }
    });
}

async function setAsDefault() {
  try {
    const serialObject = internals.pages.serialization.serialize({
      notes: [internals.pages.react.page.activeElem.react.value as PageNote],
      arrows: [],
    });

    internals.pages.defaultNote = serialObject;

    await trpcClient.users.pages.setEncryptedDefaultNote.mutate(
      internals.symmetricKeyring.encrypt(pack(serialObject), {
        padding: true,
        associatedData: {
          context: 'UserDefaultNote',
          userId: authStore().userId,
        },
      }),
    );

    $quasar().notify({
      message: 'Default note updated.',
      type: 'positive',
    });
  } catch (error: any) {
    handleError(error);
  }
}

async function createChildFromFile(file: File) {
  const fileReader = new FileReader();

  fileReader.onload = async (event) => {
    const content = String(event.target?.result ?? '');

    const childNote = await page.value.notes.create({
      region: note.value,
      center: false,
      edit: false,
    });

    if (childNote != null) {
      childNote.react.collab.head.enabled = true;
      childNote.react.collab.body.enabled = false;
      childNote.react.collab.container.enabled = false;

      if (file.name.endsWith('.md')) {
        const converter = new showdown.Converter({
          emoji: true,
          parseImgDimensions: true,
          strikethrough: true,
          tables: true,
          underline: true,
        });

        converter.addExtension(() => [
          {
            type: 'output',
            regex: /\$(.+?)\$/g,
            replace: '<inline-math>$1</inline-math>',
          },
          {
            type: 'output',
            regex: /\$\$((?:.|\n)+?)\$\$/g,
            replace: '<math-block>$1</math-block>',
          },
        ]);

        const initialHTML = converter
          .makeHtml(content)
          .replaceAll('\n', '')
          .replaceAll(/<br \/> +/g, '<br />');

        const parser = new DOMParser();
        const parsedDoc = parser.parseFromString(initialHTML, 'text/html');

        // Fix math blocks

        for (const mathBlock of Array.from(
          parsedDoc.querySelectorAll('p > math-block'),
        )) {
          mathBlock.parentElement!.outerHTML = mathBlock.outerHTML;
        }

        // Fix blockquotes

        for (const paragraph of Array.from(
          parsedDoc.querySelectorAll('blockquote > p'),
        )) {
          paragraph.parentElement!.innerHTML = paragraph.outerHTML;
        }

        const finalHTML = parsedDoc.body.innerHTML;

        childNote.react.editors[0]?.commands.insertContent(finalHTML);
      } else {
        childNote.react.editors[0]?.commands.insertContent(content);
      }
    }
  };

  fileReader.readAsText(file);
}

async function importChildrenFromFilesAux(files: File[]) {
  note.value.react.collab.container.enabled = true;
  note.value.react.collab.container.spatial = false;

  for (const file of files) {
    await createChildFromFile(file);
  }
}

async function onFileChange() {
  if (fileInput.value?.files == null || fileInput.value.files.length === 0) {
    return;
  }

  await importChildrenFromFilesAux(Array.from(fileInput.value.files));

  fileInput.value = undefined;
}

async function importChildrenFromFiles() {
  if ((window as any).showOpenFilePicker == null) {
    fileInput.value?.click();
  } else {
    const fileHandles = await (window as any).showOpenFilePicker({
      multiple: true,

      types: [
        {
          description: 'Markdown file',
          accept: { 'text/markdown': ['.md'] },
        },
      ],
    });

    const files = await Promise.all(
      fileHandles.map((fileHandle: any) => fileHandle.getFile()),
    );

    await importChildrenFromFilesAux(files);
  }
}

function noteToMarkdown(
  note: PageNote,
  params: {
    includeDescendants: boolean;
  },
) {
  let markdown = '';

  let hasPrevSection = false;

  if (note.react.collab.head.enabled && note.react.head.editor != null) {
    markdown += editorToMarkdown(note.react.head.editor);

    hasPrevSection = true;
  }

  if (note.react.collab.body.enabled && note.react.body.editor != null) {
    if (hasPrevSection) {
      markdown += '\n\n---\n\n';
    }

    markdown += editorToMarkdown(note.react.body.editor);

    hasPrevSection = true;
  }

  if (params.includeDescendants) {
    for (const childNote of note.react.notes) {
      if (hasPrevSection) {
        markdown += '\n\n---\n\n';
      }

      markdown += noteToMarkdown(childNote, {
        includeDescendants: params.includeDescendants,
      });

      hasPrevSection = true;
    }
  }

  return markdown;
}

function editorToMarkdown(editor: Editor) {
  // Prepare HTML

  const parser = new DOMParser();
  const parsedDoc = parser.parseFromString(editor.getHTML(), 'text/html');

  const divs = parsedDoc.querySelectorAll('li > div');

  for (let i = divs.length - 1; i >= 0; i--) {
    divs[i].outerHTML = divs[i].innerHTML;
  }

  const paragraphs = parsedDoc.querySelectorAll('li > p');

  for (let i = paragraphs.length - 1; i >= 0; i--) {
    paragraphs[i].outerHTML = paragraphs[i].innerHTML;
  }

  // Convert to markdown

  const turndownService = new TurndownService({
    codeBlockStyle: 'fenced',
    emDelimiter: '*',
    headingStyle: 'atx',
    hr: '---',
  });

  turndownService.addRule('strikethrough', {
    filter: ['s' as any],
    replacement: (content) => `~~${content}~~`,
  });
  turndownService.addRule('math-block', {
    filter: ['math-block' as any],
    replacement: (content) => `\n\n$$\n${content}\n$$\n\n`,
  });
  turndownService.addRule('inline-block', {
    filter: ['inline-math' as any],
    replacement: (content) => `$${content}$`,
  });
  turndownService.keep(['u', 'sub', 'sup', 'table', 'iframe']);

  return turndownService.turndown(parsedDoc.body.innerHTML);
}

async function copyAsMarkdown(params: { includeDescendants: boolean }) {
  await setClipboardText(
    noteToMarkdown(note.value, {
      includeDescendants: params.includeDescendants,
    }),
  );

  $quasar().notify({
    message: 'Copied as markdown.',
    type: 'positive',
  });
}

async function downloadAsMarkdown(params: { includeDescendants: boolean }) {
  try {
    const blob = new Blob(
      [
        noteToMarkdown(note.value, {
          includeDescendants: params.includeDescendants,
        }),
      ],
      {
        type: 'text/plain;charset=utf-8',
      },
    );

    if ((window as any).showSaveFilePicker == null) {
      saveAs(blob, 'DeepNotes-note.md');
    } else {
      const fileHandle = await (window as any).showSaveFilePicker({
        types: [
          {
            description: 'Markdown file',
            accept: { 'text/markdown': ['.md'] },
          },
        ],
      });

      const writable = await fileHandle.createWritable();

      await writable.write(blob);

      await writable.close();
    }

    $quasar().notify({
      message: 'Downloaded as markdown.',
      type: 'positive',
    });
  } catch (error) {
    handleError(error);
  }
}
</script>
