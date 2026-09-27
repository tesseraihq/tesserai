<?php
/**
 * Tidewater functions and definitions.
 *
 * @package Tidewater
 */

if ( ! function_exists( 'tidewater_setup' ) ) :
	function tidewater_setup() {
		add_theme_support( 'wp-block-styles' );
		add_editor_style( 'style.css' );
	}
endif;
add_action( 'after_setup_theme', 'tidewater_setup' );

/**
 * Block style variations.
 */
function tidewater_block_styles() {
	register_block_style(
		'core/list',
		array(
			'name'         => 'checkmark-list',
			'label'        => __( 'Checkmark', 'tidewater' ),
			'inline_style' => '
				ul.is-style-checkmark-list { list-style-type: "\2713"; }
				ul.is-style-checkmark-list li { padding-inline-start: 1ch; }',
		)
	);
}
add_action( 'init', 'tidewater_block_styles' );

/*
 * The old classic theme's stylesheet (assets/css/classic.css) is kept for the
 * archived 2019 microsite pages only. It is NOT enqueued here anymore.
 */
