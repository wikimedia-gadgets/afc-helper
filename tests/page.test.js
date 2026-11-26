/**
 * Tests for src/js/page.js
 */

/* eslint-env jest, node */

const { parseTemplates } = require( 'mwn/build/wikitext' );

function parseTreeForTest( wikitext ) {
	const xml = document.implementation.createDocument( '', 'root' );

	function addTextAndTemplates( parent, text ) {
		let offset = 0;
		parseTemplates( text ).forEach( ( template ) => {
			const start = text.indexOf( template.wikitext, offset );
			parent.appendChild( xml.createTextNode( text.slice( offset, start ) ) );
			const element = xml.createElement( 'template' );
			const title = xml.createElement( 'title' );
			title.textContent = template.name;
			element.appendChild( title );
			template.parameters.forEach( ( param ) => {
				const part = xml.createElement( 'part' );
				const name = xml.createElement( 'name' );
				const paramText = param.wikitext.slice( 1 ).replace( /^\s+/, '' );
				if ( paramText.startsWith( param.name ) && paramText.slice( param.name.length ).replace( /^\s+/, '' ).startsWith( '=' ) ) {
					name.textContent = param.name;
				} else {
					name.setAttribute( 'index', param.name );
				}
				const value = xml.createElement( 'value' );
				addTextAndTemplates( value, param.value );
				part.appendChild( name );
				if ( name.textContent ) {
					const equals = xml.createElement( 'equals' );
					equals.textContent = '=';
					part.appendChild( equals );
				}
				part.appendChild( value );
				element.appendChild( part );
			} );
			parent.appendChild( element );
			offset = start + template.wikitext.length;
		} );
		parent.appendChild( xml.createTextNode( text.slice( offset ) ) );
	}

	addTextAndTemplates( xml.documentElement, wikitext );
	return new XMLSerializer().serializeToString( xml );
}

describe( 'AFCH.Page', () => {
	afterEach( () => {
		jest.restoreAllMocks();
	} );

	it( 'returns the page title from toString()', () => {
		const page = new AFCH.Page( 'Example' );

		expect( page.toString() ).toBe( 'Example' );
	} );

	it( 'caches revision data after the first request', () => {
		const revision = {
			timestamp: '2024-01-01T00:00:00Z',
			user: 'Example editor',
			parsetree: '<root />',
			revid: 123
		};
		const getPageText = jest.spyOn( AFCH.actions, 'getPageText' )
			.mockReturnValue( $.Deferred().resolve( 'Example text', revision ) );
		const page = new AFCH.Page( 'Example' );

		expect( page.getText( false ).state() ).toBe( 'resolved' );
		expect( page.getText( true ).state() ).toBe( 'resolved' );
		expect( getPageText ).toHaveBeenCalledTimes( 1 );
		expect( page.additionalData.revId ).toBe( 123 );
	} );

	it.each( [
		[
			`{{WikiProject banner shell|class=Stub|
{{WikiProject Chemicals | importance = low }}
}}
{{WikiProject China}}`,
			[ 'Chemicals', 'China' ]
		],
		[
			`{{WikiProject banner shell|class=Stub|
{{WikiProject Germany|importance=low}}
}}`,
			[ 'Germany' ]
		],
		[
			`{{WikiProject banner shell|class=List|
{{WikiProject Anthroponymy|importance=Low}}
{{WikiProject Lists|class=List|importance=Low}}
{{WikiProject India|importance=Low|assess-date=May 2023}}
}}`,
			[ 'Anthroponymy', 'Lists', 'India' ]
		],
		[
			`{{WikiProject banner shell|class=List|
{{WikiProject Anthroponymy|importance=NA}}
}}
`,
			[ 'Anthroponymy' ]
		],
		[
			`{{WikiProject banner shell|class=Stub|
{{WikiProject Cycling |importance=Low}}
{{WikiProject Slovenia |importance=Low}}
}}`,
			[ 'Cycling', 'Slovenia' ]
		],
		[
			`{{WikiProject banner shell|class=B|blp=yes|collapsed=yes|vital=yes|listas=Obama, Barack|
{{WikiProject Biography|politician-work-group=yes|politician-priority=top|s&a-work-group=yes|s&a-priority=top}}
{{WikiProject United States|importance=Top|DC=yes|DC-importance=High|USGov=yes|USGov-importance=Top|USSL=yes|USSL-importance=Low|USPresidents=yes|USPresidents-importance=Top|USPE=yes|USPE-importance=Top|portal1-name=United States|portal1-link=Selected biography/4|portal2-name=Illinois|portal2-link=Selected biography/1|portal3-name=Chicago|portal3-link=Selected biography/7|portal4-name=Hawaii|portal4-link=Selected biography/11}}
{{WikiProject U.S. Congress|importance=High|subject=person}}
{{WikiProject Politics|importance=high|American=y|American-importance=Top}}
{{WikiProject Hawaii|importance=high}}
{{WikiProject Illinois|importance=High}}
{{WikiProject Chicago|importance=Top}}
{{WikiProject New York (state)|importance=Low|Columbia=yes|Columbia-importance=high}}
{{WikiProject African diaspora|importance=Mid}}
{{WikiProject Kenya|importance=High}}
{{WikiProject 2010s}}
{{WikiProject Law|importance=Mid}}
{{WikiProject Spoken Wikipedia}}
}}`,
			[ 'Biography', 'United States', 'U.S. Congress', 'Politics', 'Hawaii', 'Illinois',
				'Chicago', 'New York (state)', 'African diaspora', 'Kenya', '2010s', 'Law', 'Spoken Wikipedia' ]
		],
		[
			`{{WikiProject banner shell|class=GA|collapsed=y|vital=yes|1=
{{WikiProject Guild of Copy Editors|user=Lfstevens|date=25 December 2021}}
{{WikiProject COVID-19|importance=Top}}
{{WikiProject Medicine|importance=Top|pulmonology=y|pulmonology-imp=top}}
{{WikiProject Viruses|importance=Top}}
{{WikiProject Disaster management|importance=Top}}
{{WikiProject Death|importance=High}}
{{WikiProject China|importance=high|history=y}}
{{WikiProject 2010s}}
}}`,
			[ 'Guild of Copy Editors', 'COVID-19', 'Medicine', 'Viruses', 'Disaster management', 'Death', 'China', '2010s' ]
		],
		[
			`{{WikiProject banner shell|class=B|vital=yes|1=
{{WikiProject Military history
|class=B
|B1 <!-- Referencing and citations -->=n
|B2 <!-- Coverage and accuracy -->=y
|B3 <!-- Structure -->=y
|B4 <!-- Grammar and style -->=y
|B5 <!-- Supporting materials -->=y
|British=y
|German=y|WWII=y}}
{{WikiProject Germany|importance=High}}
{{WikiProject Pritzker-GLAM|importance=High}}
{{WikiProject Luxembourg|importance=High}}
{{WikiProject Belgium|importance=Mid}}
{{WikiProject United States|importance=high|USMIL=yes}}
{{WikiProject United Kingdom|importance=Mid}}
{{WikiProject France|importance=Mid}}
{{WikiProject Canada|importance=Mid|military=yes}}
{{WikiProject European history|importance=High}}
}}`,
			[ 'Military history', 'Germany', 'Pritzker-GLAM', 'Luxembourg', 'Belgium', 'United States',
				'United Kingdom', 'France', 'Canada', 'European history' ]
		]
	] )( 'finds WikiProject templates inside and outside shells', ( wikitext, projects ) => {
		const page = new AFCH.Page( 'Draft talk:Example' );
		page.hasAdditionalData = true;
		page.additionalData.rawTemplateModel = parseTreeForTest( wikitext );

		let templates;
		page.getTemplates( true ).done( ( result ) => {
			templates = result;
		} );
		expect( templates.map( ( template ) => template.target.trim() ) )
			.toEqual( [ 'WikiProject banner shell', ...projects.map( ( project ) => 'WikiProject ' + project ) ] );
	} );

	it( 'only returns top-level templates by default', () => {
		const page = new AFCH.Page( 'Example' );
		page.hasAdditionalData = true;
		page.additionalData.rawTemplateModel = parseTreeForTest(
			'{{Outer|1={{Inner|value=test}}}}{{Other}}'
		);
		let templates;
		page.getTemplates().done( ( result ) => {
			templates = result;
		} );
		expect( templates.map( ( template ) => template.target ) ).toEqual( [ 'Outer', 'Other' ] );
		expect( templates[ 0 ].params[ '1' ] ).toBe( '{{Inner|value=test}}' );
	} );

	it( 'returns itself when the page is already in a talk namespace', () => {
		const page = new AFCH.Page( 'Talk:Example' );

		expect( page.getTalkPage() ).toBe( page );
	} );
} );
